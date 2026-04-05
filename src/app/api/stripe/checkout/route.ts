import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/lib/supabase/roles';
import { createUntypedServiceClient } from '@/lib/supabase/server';
import { requireStripe } from '@/lib/stripe/client';
import { PLANS, type PlanId } from '@/lib/stripe/plans';
import { logAudit } from '@/lib/audit/log';

const checkoutSchema = z.object({
  planId: z.enum(['starter', 'growth', 'enterprise']),
  orgId: z.string().uuid(),
});

/**
 * POST /api/stripe/checkout — Create a Stripe Checkout Session
 */
export async function POST(request: NextRequest) {
  try {
    const { user, profile } = await requireRole('admin');
    const body = await request.json();
    const parsed = checkoutSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { planId, orgId } = parsed.data;

    // Verify the user belongs to this org
    if ((profile.org_id as string) !== orgId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const plan = PLANS[planId as PlanId];
    if (!plan.stripePriceId) {
      return NextResponse.json(
        { error: 'This plan cannot be purchased online. Contact sales.' },
        { status: 400 },
      );
    }

    const stripe = requireStripe();
    const supabase = await createUntypedServiceClient();

    // Check for existing Stripe customer
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('org_id', orgId)
      .maybeSingle();

    let customerId = subscription?.stripe_customer_id as string | undefined;

    // Create a Stripe customer if needed
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { org_id: orgId },
      });
      customerId = customer.id;
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: plan.stripePriceId, quantity: 1 }],
      success_url: `${appUrl}/settings/billing?checkout=success`,
      cancel_url: `${appUrl}/settings/billing?checkout=cancelled`,
      metadata: { org_id: orgId, plan_id: planId },
      subscription_data: {
        metadata: { org_id: orgId, plan_id: planId },
      },
    });

    await logAudit({
      orgId,
      userId: user.id,
      action: 'stripe.checkout.created',
      entityType: 'subscription',
      metadata: { planId, sessionId: session.id },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('[stripe/checkout] Error:', error);
    const message = error instanceof Error ? error.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
