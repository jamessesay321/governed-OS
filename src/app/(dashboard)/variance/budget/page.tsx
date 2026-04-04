import { redirect } from 'next/navigation';

/**
 * /variance/budget → redirects to /financials/budget
 * The full budget entry + comparison UI lives under financials.
 */
export default function VarianceBudgetRedirect() {
  redirect('/financials/budget');
}
