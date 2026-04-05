import { getUserProfile } from '@/lib/auth/get-user-profile';
import { createUntypedServiceClient } from '@/lib/supabase/server';
import { getTokenBudget } from '@/lib/ai/token-budget';
import BillingClient from './billing-client';

export default async function BillingPage() {
  const { orgId, role } = await getUserProfile();
  const supabase = await createUntypedServiceClient();

  // Fetch subscription
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('org_id', orgId)
    .maybeSingle();

  // Fetch token budget
  const budget = await getTokenBudget(orgId);

  return (
    <BillingClient
      orgId={orgId}
      role={role}
      subscription={subscription ? {
        plan: subscription.plan as string,
        status: subscription.status as string,
        currentPeriodEnd: subscription.current_period_end as string | null,
        cancelAtPeriodEnd: subscription.cancel_at_period_end as boolean,
        hasStripeCustomer: !!subscription.stripe_customer_id,
      } : null}
      budget={{
        used: budget.used,
        limit: budget.limit === Infinity ? -1 : budget.limit,
        resetDate: budget.resetDate.toISOString(),
      }}
    />
  );
}
