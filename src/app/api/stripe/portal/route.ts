import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/roles';
import { createUntypedServiceClient } from '@/lib/supabase/server';
import { requireStripe } from '@/lib/stripe/client';
import { logAudit } from '@/lib/audit/log';

/**
 * POST /api/stripe/portal — Create a Stripe Billing Portal session
 */
export async function POST() {
  try {
    const { user, profile } = await requireRole('admin');
    const orgId = profile.org_id as string;

    const supabase = await createUntypedServiceClient();

    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('org_id', orgId)
      .maybeSingle();

    const customerId = subscription?.stripe_customer_id as string | undefined;
    if (!customerId) {
      return NextResponse.json(
        { error: 'No billing account found. Subscribe to a plan first.' },
        { status: 404 },
      );
    }

    const stripe = requireStripe();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${appUrl}/settings/billing`,
    });

    await logAudit({
      orgId,
      userId: user.id,
      action: 'stripe.portal.opened',
      entityType: 'subscription',
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('[stripe/portal] Error:', error);
    const message = error instanceof Error ? error.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
