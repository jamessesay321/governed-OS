const BRAND = {
  primary: '#059669',
  textDark: '#1f2937',
  textMuted: '#6b7280',
  bgBody: '#f9fafb',
  bgCard: '#ffffff',
  border: '#e5e7eb',
} as const;

/**
 * Email template for GDPR deletion confirmation.
 */
export function deletionRequestEmailTemplate(confirmUrl: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Confirm Data Deletion - Grove</title>
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
          <tr>
            <td align="center" style="padding: 32px 24px 24px;">
              <span style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 28px; font-weight: 700; color: ${BRAND.primary}; letter-spacing: -0.5px;">Grove</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 32px 32px;">
              <h1 style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 22px; font-weight: 700; color: ${BRAND.textDark}; margin: 0 0 16px;">Confirm Data Deletion</h1>
              <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; line-height: 24px; color: ${BRAND.textDark}; margin: 0 0 16px;">
                You requested deletion of all your organisation's data from Grove. This action is <strong>permanent and irreversible</strong>.
              </p>
              <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; line-height: 24px; color: ${BRAND.textDark}; margin: 0 0 16px;">
                After confirmation, there is a <strong>72-hour cooling-off period</strong> during which you can cancel the request. After that, all data (financials, connections, scenarios, KPIs, and more) will be permanently deleted.
              </p>
              <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; line-height: 24px; color: ${BRAND.textDark}; margin: 0 0 24px;">
                Audit logs will be retained for compliance purposes.
              </p>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto 24px;">
                <tr>
                  <td align="center" style="background-color: #dc2626; border-radius: 8px;">
                    <a href="${confirmUrl}" target="_blank" style="
                      display: inline-block;
                      padding: 14px 32px;
                      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                      font-size: 15px;
                      font-weight: 600;
                      color: #ffffff;
                      text-decoration: none;
                      border-radius: 8px;
                    ">Confirm Deletion</a>
                  </td>
                </tr>
              </table>
              <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; line-height: 20px; color: ${BRAND.textMuted}; margin: 0;">
                If you did not make this request, please ignore this email or contact support immediately.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
