import { NextResponse, type NextRequest } from 'next/server';
import { requireRole } from '@/lib/supabase/roles';
import { createServiceClient } from '@/lib/supabase/server';
import { logAudit } from '@/lib/audit/log';
import Anthropic from '@anthropic-ai/sdk';

/**
 * POST /api/onboarding/scan
 * Scans a business website and extracts context to personalise the onboarding interview.
 * Uses Claude to analyse the website content and extract structured business intelligence.
 */
export async function POST(request: NextRequest) {
  try {
    const { user, profile } = await requireRole('admin');
    const body = await request.json();
    const { websiteUrl, businessDescription } = body as {
      websiteUrl?: string;
      businessDescription?: string;
    };

    if (!websiteUrl && !businessDescription) {
      return NextResponse.json(
        { error: 'Please provide a website URL or business description' },
        { status: 400 }
      );
    }

    // Fetch website content if URL provided
    let websiteContent = '';
    if (websiteUrl) {
      try {
        const url = websiteUrl.startsWith('http')
          ? websiteUrl
          : `https://${websiteUrl}`;

        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Governed-OS-Onboarding/1.0',
            Accept: 'text/html',
          },
          signal: AbortSignal.timeout(10000),
        });

        if (response.ok) {
          const html = await response.text();
          // Strip HTML tags and extract text content (basic extraction)
          websiteContent = html
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 8000); // Limit to ~8k chars to stay within token limits
        }
      } catch (fetchError) {
        console.warn('[SCAN] Failed to fetch website:', fetchError);
        // Continue without website content — we can still use the description
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
      // Try to parse JSON from the response (handle markdown code blocks)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        scanResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch {
      console.error('[SCAN] Failed to parse AI response:', responseText);
      return NextResponse.json(
        { error: 'Failed to analyse business — please try again' },
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
      } as any)
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
