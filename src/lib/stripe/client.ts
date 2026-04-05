import Stripe from 'stripe';

/**
 * Lazy singleton Stripe client.
 * Returns null when STRIPE_SECRET_KEY is not set (graceful degradation for dev).
 */
let _stripe: Stripe | null = null;
let _checked = false;

export function getStripe(): Stripe | null {
  if (_checked) return _stripe;
  _checked = true;

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    console.warn('[stripe] STRIPE_SECRET_KEY not set — Stripe features disabled');
    return null;
  }

  _stripe = new Stripe(key);

  return _stripe;
}

/**
 * Get the Stripe client or throw. Use in routes that require Stripe.
 */
export function requireStripe(): Stripe {
  const stripe = getStripe();
  if (!stripe) {
    throw new Error('Stripe is not configured. Set STRIPE_SECRET_KEY.');
  }
  return stripe;
}
