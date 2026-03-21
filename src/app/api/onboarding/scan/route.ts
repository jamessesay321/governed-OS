import { NextResponse, type NextRequest } from 'next/server';
import { requireRole } from '@/lib/supabase/roles';
import { createServiceClient } from '@/lib/supabase/server';
import { logAudit } from '@/lib/audit/log';
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';

const scanRequestSchema = z.object({
  websiteUrl: z.string().max(2048).optional(),
  businessDescription: z.string().max(5000).optional(),
}).refine(data => data.websiteUrl || data.businessDescription, {
  message: 'Please provide a website URL or business description',
});

/** Validate a URL is safe to fetch (prevent SSRF attacks). */
function isUrlSafe(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    if (!['http:', 'https:'].includes(url.protocol)) return false;
    const hostname = url.hostname.toLowerCase();
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '0.0.0.0' ||
      hostname === '::1' ||
      hostname.endsWith('.local') ||
      hostname.endsWith('.internal') ||
      hostname.startsWith('10.') ||
      hostname.startsWith('192.168.') ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(hostname) ||
      hostname === 'metadata.google.internal' ||
      hostname === '169.254.169.254'
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * POST /api/onboarding/scan
 * Scans a business website and extracts context to personalise the onboarding interview.
 * Uses Claude to analyse the website content and extract structured business intelligence.
 */
export async function POST(request: NextRequest) {
  try {
    const { user, profile } = await requireRole('admin');
    const body = await request.json();

    const parsed = scanRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
        { status: 400 }
      );
    }

    const { websiteUrl, businessDescription } = parsed.data;

    // Fetch website content if URL provided
    let websiteContent = '';
    if (websiteUrl) {
      try {
        const url = websiteUrl.startsWith('http')
          ? websiteUrl
          : `https://${websiteUrl}`;

        if (!isUrlSafe(url)) {
          return NextResponse.json(
            { error: 'Invalid or blocked URL. Only public websites are allowed' },
            { status: 400 }
          );
        }

        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Governed-OS-Onboarding/1.0',
            Accept: 'text/html',
          },
          signal: AbortSignal.timeout(10000),
          redirect: 'follow',
        });

        if (response.ok) {
          const html = await response.text();
          websiteContent = html
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 8000);
        }
      } catch (fetchError) {
        console.warn('[SCAN] Failed to fetch website:', fetchError);
      }
    }

    // Build the analysis prompt
    const contextParts: string[] = [];
    if (websiteUrl) contextParts.push(`Website: ${websiteUrl}`);
    if (businessDescription) contextParts.push(`Owner's description: ${businessDescription}`);
    if (websiteContent) contextParts.push(`Website content:\n${websiteContent}`);

    if (contextParts.length === 0) {
      return NextResponse.json(
        { error: 'No content to analyse' },
        { status: 400 }
      );
    }

    // Use Claude to extract business intelligence
    const anthropic = new Anthropic();

    const aiResponse = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      messages: [
        {
          role: 'user',
          content: `Analyse this business and extract structured intelligence. Respond with ONLY valid JSON.

${contextParts.join('\n\n')}

## Output JSON Schema
{
  "company_name": "string — the company/business name",
  "industry": "string — the industry/sector they operate in",
  "business_type": "string — e.g., SaaS, Agency, E-commerce, Professional Services, Manufacturing, etc.",
  "target_market": "string — who their customers are (B2B, B2C, specific segments)",
  "products_services": ["string array — main products or services they offer"],
  "value_proposition": "string — their core value proposition in one sentence",
  "estimated_stage": "string — startup | growth | mature | enterprise (best guess from website)",
  "estimated_team_size": "string — solo | small (2-10) | medium (11-50) | large (50+) (best guess)",
  "key_differentiators": ["string array — what makes them stand out"],
  "potential_challenges": ["string array — likely business challenges based on their type/stage"],
  "suggested_kpis": ["string array — KPIs that would be most relevant for this type of business"],
  "suggested_modules": ["string array — from this list, pick the most relevant: cash-forecast, workforce-planning, unit-economics, fundraising-readiness, customer-analytics, project-profitability"],
  "conversation_starters": ["string array — 2-3 specific, personalised questions to ask in the onboarding interview that reference their actual business"]
}

Rules:
- Only include information you can reasonably infer from the provided content
- Be specific — reference their actual products, services, or market where possible
- For suggested_modules, only include 2-4 most relevant ones
- conversation_starters should be specific to THIS business, not generic`,
        },
      ],
    });

    // Parse the AI response
    const responseText =
      aiResponse.content[0].type === 'text' ? aiResponse.content[0].text : '';

    let scanResult;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        scanResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch {
      console.error('[SCAN] Failed to parse AI response:', responseText);
      return NextResponse.json(
        { error: 'Failed to analyse business. Please try again' },
        { status: 500 }
      );
    }

    // Store the scan result on the organisation
    const supabase = await createServiceClient();
    await supabase
      .from('organisations')
      .update({
        website_url: websiteUrl || null,
        business_scan: scanResult,
      } as Record<string, unknown>)
      .eq('id', profile.org_id);

    await logAudit({
      orgId: profile.org_id,
      userId: user.id,
      action: 'onboarding.website_scanned',
      entityType: 'organisation',
      entityId: profile.org_id,
      metadata: { websiteUrl, hasDescription: !!businessDescription },
    });

    return NextResponse.json({ scan: scanResult });
  } catch (err) {
    console.error('[SCAN] Error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
