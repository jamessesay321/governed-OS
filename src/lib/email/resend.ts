import { Resend } from 'resend';

// Singleton Resend client — reused across requests in the same process
let _client: Resend | null = null;

function getClient(): Resend {
  if (!_client) {
    const key = process.env.RESEND_API_KEY;
    if (!key) {
      throw new Error('RESEND_API_KEY environment variable is not set');
    }
    _client = new Resend(key);
  }
  return _client;
}

const SUBJECT_MAP: Record<string, string> = {
  welcome: 'Welcome to Grove',
  verification: 'Verify your email address',
  'password-reset': 'Reset your password',
  invitation: 'You have been invited to join a team on Grove',
  'challenges-digest': 'Grove: Open challenges need your attention',
};

const FROM_ADDRESS = process.env.RESEND_FROM_ADDRESS ?? 'Grove <notifications@grove.dev>';

/**
 * Send a transactional email via Resend.
 *
 * In development (no RESEND_API_KEY), logs to console instead of sending.
 */
export async function sendEmail(opts: {
  to: string;
  template: string;
  html: string;
  subject?: string;
}): Promise<{ id: string | null; dev: boolean }> {
  const subject = opts.subject ?? SUBJECT_MAP[opts.template] ?? 'Grove Notification';

  // Dev mode: log instead of sending when no API key is configured
  if (!process.env.RESEND_API_KEY) {
    console.log('[email] DEV MODE — would send:', {
      from: FROM_ADDRESS,
      to: opts.to,
      subject,
      template: opts.template,
      htmlLength: opts.html.length,
    });
    return { id: null, dev: true };
  }

  const resend = getClient();
  const { data, error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to: opts.to,
    subject,
    html: opts.html,
  });

  if (error) {
    console.error('[email] Resend error:', error);
    throw new Error(`Failed to send email: ${error.message}`);
  }

  return { id: data?.id ?? null, dev: false };
}
