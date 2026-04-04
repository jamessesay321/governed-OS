// ---------------------------------------------------------------------------
// Grove - Branded email templates (inline-styled, email-client safe)
// ---------------------------------------------------------------------------

const BRAND = {
  primary: '#059669',       // emerald-600
  primaryDark: '#047857',   // emerald-700 (hover/accent)
  textDark: '#1f2937',      // gray-800
  textMuted: '#6b7280',     // gray-500
  bgBody: '#f9fafb',        // gray-50
  bgCard: '#ffffff',
  border: '#e5e7eb',        // gray-200
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.grove.dev',
} as const;

// ── Shared layout pieces ────────────────────────────────────────────────────

function header(): string {
  return `
    <tr>
      <td align="center" style="padding: 32px 24px 24px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
              font-size: 28px;
              font-weight: 700;
              color: ${BRAND.primary};
              letter-spacing: -0.5px;
            ">
              Grove
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
}

function footer(): string {
  return `
    <tr>
      <td style="padding: 24px 32px 32px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td style="border-top: 1px solid ${BRAND.border}; padding-top: 24px;">
              <p style="
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                font-size: 12px;
                line-height: 18px;
                color: ${BRAND.textMuted};
                margin: 0 0 8px;
                text-align: center;
              ">
                Sent by <span style="color: ${BRAND.primary}; font-weight: 600;">Grove</span> &middot; Smart governance for modern organisations
              </p>
              <p style="
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                font-size: 12px;
                line-height: 18px;
                color: ${BRAND.textMuted};
                margin: 0;
                text-align: center;
              ">
                <a href="{{unsubscribe_url}}" style="color: ${BRAND.textMuted}; text-decoration: underline;">Unsubscribe</a>
                &nbsp;&middot;&nbsp;
                <a href="${BRAND.appUrl}/settings/notifications" style="color: ${BRAND.textMuted}; text-decoration: underline;">Email preferences</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
}

function ctaButton(label: string, url: string): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin: 24px auto;">
      <tr>
        <td align="center" style="
          background-color: ${BRAND.primary};
          border-radius: 8px;
        ">
          <a href="${url}" target="_blank" style="
            display: inline-block;
            padding: 14px 32px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            font-size: 15px;
            font-weight: 600;
            color: #ffffff;
            text-decoration: none;
            border-radius: 8px;
          ">${label}</a>
        </td>
      </tr>
    </table>`;
}

function wrap(bodyRows: string): string {
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>Grove</title>
  <!--[if mso]>
  <style>table,td{font-family:Arial,Helvetica,sans-serif!important}</style>
  <![endif]-->
</head>
<body style="margin:0; padding:0; background-color:${BRAND.bgBody}; -webkit-font-smoothing:antialiased;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${BRAND.bgBody};">
    <tr>
      <td align="center" style="padding: 24px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="
          max-width: 600px;
          width: 100%;
          background-color: ${BRAND.bgCard};
          border-radius: 12px;
          border: 1px solid ${BRAND.border};
        ">
          ${header()}
          ${bodyRows}
          ${footer()}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function paragraph(text: string): string {
  return `<p style="
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    font-size: 15px;
    line-height: 24px;
    color: ${BRAND.textDark};
    margin: 0 0 16px;
  ">${text}</p>`;
}

function heading(text: string): string {
  return `<h1 style="
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    font-size: 22px;
    font-weight: 700;
    color: ${BRAND.textDark};
    margin: 0 0 16px;
    line-height: 30px;
  ">${text}</h1>`;
}

function muted(text: string): string {
  return `<p style="
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    font-size: 13px;
    line-height: 20px;
    color: ${BRAND.textMuted};
    margin: 16px 0 0;
  ">${text}</p>`;
}

// ── Template functions ──────────────────────────────────────────────────────

/**
 * Welcome email sent after a new user signs up.
 */
export function welcomeEmailTemplate(displayName: string): string {
  const body = `
    <tr>
      <td style="padding: 0 32px 24px;">
        ${heading(`Welcome to Grove, ${displayName}!`)}
        ${paragraph(
          "We're glad you're here. Grove helps your organisation stay on top of governance, finances, and strategy, all in one place."
        )}
        ${paragraph(
          "Here are a few things you can do to get started:"
        )}
        <ul style="
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          font-size: 15px;
          line-height: 24px;
          color: ${BRAND.textDark};
          margin: 0 0 8px;
          padding-left: 20px;
        ">
          <li style="margin-bottom: 8px;">Explore your dashboard for a quick overview of your organisation</li>
          <li style="margin-bottom: 8px;">Set up your KPIs and financial tracking</li>
          <li style="margin-bottom: 8px;">Invite your team so everyone stays in the loop</li>
        </ul>
        ${ctaButton('Go to Dashboard', `${BRAND.appUrl}/dashboard`)}
        ${muted("If you have any questions, just reply to this email. We're happy to help.")}
      </td>
    </tr>`;

  return wrap(body);
}

/**
 * Email verification sent after signup or email change.
 */
export function verificationEmailTemplate(
  displayName: string,
  verifyUrl: string,
): string {
  const body = `
    <tr>
      <td style="padding: 0 32px 24px;">
        ${heading('Verify your email')}
        ${paragraph(
          `Hi ${displayName}, thanks for signing up for Grove! Please confirm your email address so we can keep your account secure.`
        )}
        ${ctaButton('Verify Email Address', verifyUrl)}
        ${muted(
          "This link will expire in 24 hours. If you didn't create a Grove account, you can safely ignore this email."
        )}
      </td>
    </tr>`;

  return wrap(body);
}

/**
 * Password reset email.
 */
export function passwordResetEmailTemplate(
  displayName: string,
  resetUrl: string,
): string {
  const body = `
    <tr>
      <td style="padding: 0 32px 24px;">
        ${heading('Reset your password')}
        ${paragraph(
          `Hi ${displayName}, we received a request to reset the password on your Grove account. Click the button below to choose a new one.`
        )}
        ${ctaButton('Reset Password', resetUrl)}
        ${muted(
          "This link will expire in 1 hour. Please do not share it with anyone. If you did not request a password reset, no action is needed and your account remains secure."
        )}
      </td>
    </tr>`;

  return wrap(body);
}

/**
 * Team invitation email.
 */
export function invitationEmailTemplate(
  inviterName: string,
  orgName: string,
  inviteUrl: string,
): string {
  const body = `
    <tr>
      <td style="padding: 0 32px 24px;">
        ${heading(`${inviterName} invited you to ${orgName} on Grove`)}
        ${paragraph(
          "Grove is a smart governance platform that helps organisations manage finances, track KPIs, and collaborate on strategy. Your team is already there and waiting for you."
        )}
        ${ctaButton('Accept Invitation', inviteUrl)}
        ${muted(
          "This invitation will expire in 7 days. If you weren't expecting this invite, you can safely ignore this email."
        )}
      </td>
    </tr>`;

  return wrap(body);
}

// ── Severity helpers for challenge digest ───────────────────────────────────

const SEVERITY_COLOURS: Record<ChallengeSeverity, string> = {
  error: '#ef4444',
  concern: '#f59e0b',
  question: '#3b82f6',
};

const SEVERITY_LABELS: Record<ChallengeSeverity, string> = {
  error: 'Error',
  concern: 'Concern',
  question: 'Question',
};

const SEVERITY_ORDER: readonly ChallengeSeverity[] = ['error', 'concern', 'question'] as const;

type ChallengeSeverity = 'question' | 'concern' | 'error';

interface DigestChallenge {
  severity: ChallengeSeverity;
  page: string;
  metricLabel: string;
  metricValue: string;
  reason: string;
  createdAt: string;
}

function severityBadge(severity: ChallengeSeverity): string {
  const colour = SEVERITY_COLOURS[severity];
  const label = SEVERITY_LABELS[severity];
  return `<span style="
    display: inline-block;
    padding: 2px 10px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    font-size: 12px;
    font-weight: 600;
    color: #ffffff;
    background-color: ${colour};
    border-radius: 4px;
    line-height: 18px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  ">${label}</span>`;
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 1) + '\u2026';
}

function challengeRow(challenge: DigestChallenge): string {
  return `
    <tr>
      <td style="padding: 12px 16px; border-bottom: 1px solid ${BRAND.border}; vertical-align: top;">
        ${severityBadge(challenge.severity)}
      </td>
      <td style="
        padding: 12px 16px;
        border-bottom: 1px solid ${BRAND.border};
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        font-size: 14px;
        line-height: 20px;
        color: ${BRAND.textDark};
        vertical-align: top;
      ">
        <strong>${challenge.metricLabel}</strong>
        <span style="color: ${BRAND.textMuted};"> &middot; ${challenge.page}</span>
        <br />
        <span style="color: ${BRAND.textMuted}; font-size: 13px;">
          Value: <strong>${challenge.metricValue}</strong> &mdash; ${truncate(challenge.reason, 80)}
        </span>
      </td>
    </tr>`;
}

/**
 * Weekly digest email summarising open challenges for an organisation.
 */
export function challengeDigestEmailTemplate(opts: {
  userName: string;
  orgName: string;
  openCount: number;
  challenges: DigestChallenge[];
  reviewQueueUrl: string;
}): string {
  // Group challenges by severity in priority order
  const grouped = new Map<ChallengeSeverity, DigestChallenge[]>();
  for (const sev of SEVERITY_ORDER) {
    const items = opts.challenges.filter((c) => c.severity === sev);
    if (items.length > 0) {
      grouped.set(sev, items);
    }
  }

  let tableRows = '';
  for (const [severity, items] of grouped) {
    tableRows += `
      <tr>
        <td colspan="2" style="
          padding: 10px 16px 4px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          font-size: 13px;
          font-weight: 700;
          color: ${SEVERITY_COLOURS[severity]};
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border-bottom: 2px solid ${SEVERITY_COLOURS[severity]};
        ">
          ${SEVERITY_LABELS[severity]}s (${items.length})
        </td>
      </tr>`;
    for (const ch of items) {
      tableRows += challengeRow(ch);
    }
  }

  const body = `
    <tr>
      <td style="padding: 0 32px 24px;">
        ${heading(`Hi ${opts.userName},`)}
        ${paragraph(
          `You have <strong>${opts.openCount} open challenge${opts.openCount === 1 ? '' : 's'}</strong> for <strong>${opts.orgName}</strong> that need attention.`
        )}
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="
          border: 1px solid ${BRAND.border};
          border-radius: 8px;
          border-collapse: separate;
          overflow: hidden;
          margin-bottom: 8px;
        ">
          ${tableRows}
        </table>
        ${ctaButton('View Review Queue', opts.reviewQueueUrl)}
        ${muted('Manage email preferences in Settings')}
      </td>
    </tr>`;

  return wrap(body);
}
