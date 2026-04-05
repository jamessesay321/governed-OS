import { NextResponse, type NextRequest } from 'next/server';
import Stripe from 'stripe';
import { requireStripe } from '@/lib/stripe/client';
import { createUntypedServiceClient } from '@/lib/supabase/server';
import { logAudit } from '@/lib/audit/log';

export const maxDuration = 30;

/**
 * POST /api/stripe/webhook — Stripe webhook handler
 * Verifies signature, processes billing events, updates subscriptions table.
 */
export async function POST(request: NextRequest) {
  const stripe = requireStripe();
  const body = await request.text();
  const sig = request.headers.get('stripe-signature');

  if (!sig) {
    return NextResponse.json({ error: 'Missing stripe-signature' }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('[stripe/webhook] STRIPE_WEBHOOK_SECRET not set');
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Signature verification failed';
    console.error('[stripe/webhook] Signature error:', message);
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const supabase = await createUntypedServiceClient();

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const orgId = session.metadata?.org_id;
        const planId = session.metadata?.plan_id ?? 'starter';

        if (!orgId) {
          console.error('[stripe/webhook] checkout.session.completed missing org_id');
          break;
        }

        // Upsert subscription record
        const { error } = await supabase
          .from('subscriptions')
          .upsert(
            {
              org_id: orgId,
              stripe_customer_id: session.customer as string,
              stripe_subscription_id: session.subscription as string,
              plan: planId,
              status: 'active',
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'org_id' },
          );

        if (error) {
          console.error('[stripe/webhook] upsert subscription error:', error.message);
        }

        await logAudit(
          {
            orgId,
            userId: 'system',
            action: 'subscription.created',
            entityType: 'subscription',
            changes: { plan: planId, status: 'active' },
            metadata: { stripeSessionId: session.id },
          },
          { critical: false },
        );
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        const orgId = sub.metadata?.org_id;
        if (!orgId) break;

        const planId = sub.metadata?.plan_id ?? 'free';
        const status = mapStripeStatus(sub.status);

        const { error } = await supabase
          .from('subscriptions')
          .upsert(
            {
              org_id: orgId,
              stripe_customer_id: sub.customer as string,
              stripe_subscription_id: sub.id,
              plan: planId,
              status,
              current_period_start: new Date(((sub as unknown as Record<string, unknown>).current_period_start as number) * 1000).toISOString(),
              current_period_end: new Date(((sub as unknown as Record<string, unknown>).current_period_end as number) * 1000).toISOString(),
              cancel_at_period_end: sub.cancel_at_period_end,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'org_id' },
          );

        if (error) {
          console.error('[stripe/webhook] update subscription error:', error.message);
        }

        await logAudit(
          {
            orgId,
            userId: 'system',
            action: 'subscription.updated',
            entityType: 'subscription',
            changes: { plan: planId, status, cancelAtPeriodEnd: sub.cancel_at_period_end },
          },
          { critical: false },
        );
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const orgId = sub.metadata?.org_id;
        if (!orgId) break;

        const { error } = await supabase
          .from('subscriptions')
          .update({
            plan: 'free',
            status: 'cancelled',
            cancel_at_period_end: false,
            updated_at: new Date().toISOString(),
          })
          .eq('org_id', orgId);

        if (error) {
          console.error('[stripe/webhook] delete subscription error:', error.message);
        }

        await logAudit(
          {
            orgId,
            userId: 'system',
            action: 'subscription.cancelled',
            entityType: 'subscription',
            changes: { plan: 'free', status: 'cancelled' },
          },
          { critical: false },
        );
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        // Look up org by stripe customer ID
        const { data: subscription } = await supabase
          .from('subscriptions')
          .select('org_id')
          .eq('stripe_customer_id', customerId)
          .maybeSingle();

        if (subscription?.org_id) {
          const orgId = subscription.org_id as string;

          await supabase
            .from('subscriptions')
            .update({ status: 'past_due', updated_at: new Date().toISOString() })
            .eq('org_id', orgId);

          await logAudit(
            {
              orgId,
              userId: 'system',
              action: 'subscription.payment_failed',
              entityType: 'subscription',
              metadata: { invoiceId: invoice.id },
            },
            { critical: false },
          );
        }
        break;
      }

      default:
        // Unhandled event type — log but don't fail
        console.log(`[stripe/webhook] Unhandled event type: ${event.type}`);
    }
  } catch (error) {
    console.error('[stripe/webhook] Processing error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

function mapStripeStatus(status: Stripe.Subscription.Status): string {
  switch (status) {
    case 'active':
      return 'active';
    case 'past_due':
      return 'past_due';
    case 'canceled':
      return 'cancelled';
    case 'trialing':
      return 'trialing';
    default:
      return 'active';
  }
}
