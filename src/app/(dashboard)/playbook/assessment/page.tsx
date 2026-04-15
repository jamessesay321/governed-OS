import { redirect } from 'next/navigation';

/**
 * /playbook/assessment — redirects to the main playbook page with auto-run.
 *
 * The full assessment UI lives in /playbook via PlaybookClient.
 * This route exists so that any links or bookmarks pointing here
 * still work and land the user in the right place.
 */
export default function PlaybookAssessmentPage() {
  redirect('/playbook?run=true');
}
