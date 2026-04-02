import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRole, AuthorizationError } from '@/lib/supabase/roles';
import {
  welcomeEmailTemplate,
  verificationEmailTemplate,
  passwordResetEmailTemplate,
  invitationEmailTemplate,
} from '@/lib/email/templates';
import { sendEmail } from '@/lib/email/resend';

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const sendEmailSchema = z.discriminatedUnion('template', [
  z.object({
    template: z.literal('welcome'),
    to: z.email(),
    data: z.object({ displayName: z.string().min(1) }),
  }),
  z.object({
    template: z.literal('verification'),
    to: z.email(),
    data: z.object({
      displayName: z.string().min(1),
      verifyUrl: z.url(),
    }),
  }),
  z.object({
    template: z.literal('password-reset'),
    to: z.email(),
    data: z.object({
      displayName: z.string().min(1),
      resetUrl: z.url(),
    }),
  }),
  z.object({
    template: z.literal('invitation'),
    to: z.email(),
    data: z.object({
      inviterName: z.string().min(1),
      orgName: z.string().min(1),
      inviteUrl: z.url(),
    }),
  }),
]);

type SendEmailPayload = z.infer<typeof sendEmailSchema>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderTemplate(payload: SendEmailPayload): string {
  switch (payload.template) {
    case 'welcome':
      return welcomeEmailTemplate(payload.data.displayName);
    case 'verification':
      return verificationEmailTemplate(
        payload.data.displayName,
        payload.data.verifyUrl,
      );
    case 'password-reset':
      return passwordResetEmailTemplate(
        payload.data.displayName,
        payload.data.resetUrl,
      );
    case 'invitation':
      return invitationEmailTemplate(
        payload.data.inviterName,
        payload.data.orgName,
        payload.data.inviteUrl,
      );
  }
}

// ---------------------------------------------------------------------------
// POST /api/email/send
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    await requireRole('admin');

    const body = await req.json();
    const result = sendEmailSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation failed', issues: result.error.issues },
        { status: 400 },
      );
    }

    const payload = result.data;
    const html = renderTemplate(payload);

    const { id, dev } = await sendEmail({
      to: payload.to,
      template: payload.template,
      html,
    });

    return NextResponse.json({
      success: true,
      template: payload.template,
      emailId: id,
      dev,
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error('[email/send] POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
