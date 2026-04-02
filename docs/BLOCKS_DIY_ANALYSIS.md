# Competitive Platform Reviews — Blocks.diy & AthenaGen AI

**Date:** 1 April 2026  
**Purpose:** Strategic assessment of Blocks.diy and AthenaGen AI as reference platforms, competitive signals, and sources of replicable/leverageable patterns for Advisory OS.

---

## 1. What Blocks.diy Actually Is

Blocks.diy is a **horizontal AI-native no-code workspace** founded in 2025 by two monday.com alumni (Michal Lupu, CEO; Tal Haramati, CTO). They raised a $10M seed round led by monday.com (its first external investment), with Qumra Capital and Entree Capital participating.

**Core proposition:** Describe what you need in plain language → an AI builder ("Ella") generates a fully functional work application with integrated automation, AI agents, custom UI, and database — no code required.

**Target:** Any team, any industry — hospitals, venture funds, construction, tech operations, HR, sales, marketing. This is deliberately **horizontal**.

**Compliance:** SOC 2, ISO 27001, GDPR certified.

---

## 2. Feature-by-Feature Breakdown

### 2.1 Conversational App Builder ("Ella")
- Natural language prompt → complete application (UI + data + logic + agents)
- Follow-up questions to clarify data structures, integrations, UI behaviour
- Iterative refinement through conversation
- Auto-generates folder structure, components, API logic, utility modules
- Template marketplace for instant deployment or customisation

### 2.2 AI Agent System
- Pre-defined agent roles: Financial Analyst, Sales Manager, HR Specialist, Executive Assistant, AI Researcher, Operations Manager, Customer Success, Creative Director
- Agents have **defined goals, instructions, and knowledge bases**
- Agents take real actions: schedule meetings, send emails, analyse data, create reports, search the web, generate images
- 24/7 automated triggers based on configurable rules
- Multi-agent coordination — agents can work through tasks concurrently
- Upcoming: **code actions** (Ella writes backend code on demand), **voice agents** (phone calls with intelligent conversation)

### 2.3 Integration Layer
- Native integrations: HubSpot CRM, LinkedIn, Gmail, Google Workspace (Calendar, Drive, Docs, Meet), Slack, Notion, Snowflake, monday.com, YouTube, Twitter
- "Hundreds of apps" via integration marketplace
- Zero-configuration connection to existing business systems
- Agents operate across connected systems (extract, analyse, act, coordinate)

### 2.4 Data & Database
- Built-in database powering every application
- Data stores and connects all work information in one place
- Cross-system data extraction and coordination via agents

### 2.5 Custom UI Generation
- AI generates tailored interfaces per role and use case
- Customisable views, dashboards, forms
- Portals and public pages (branded, badge-free on paid plans)
- Custom URLs for public-facing pages
- Mobile-responsive

### 2.6 Collaboration & Access Control
- Pre-built workspaces for teams, clients, partners, vendors
- Role-based permissions and customisable views per user
- External user support (5 free, scaling to 100+ on higher tiers)
- Multi-user collaboration on projects

### 2.7 Security & Compliance
- SOC 2, ISO 27001, GDPR
- Enterprise-grade encryption
- Trust Center published
- Hosting and deployment handled by platform

### 2.8 Pricing Model
- **Free:** Single user, 5 external users, limited credits, unlimited app creation
- **Pro:** ~$16/mo, 3 users, 20 external users, unlimited apps & workflows, custom URLs, AI agents
- **Expert:** ~$40/mo, 10 users, 100 external users, 2.5x credits
- **Business:** Custom, advanced permissions, private apps, custom integrations
- Usage-based credit system (builder credits + usage credits)

### 2.9 Template Marketplace
- Community-built templates by domain experts
- Instant deployment or full customisation
- Categories span CRM, hiring, operations, content management, sales

---

## 3. Honest Assessment — What's Good & What's Not

### What Blocks.diy Does Well
1. **Conversational builder UX** — The "describe it, it builds it" pattern is genuinely compelling. Removes the learning curve entirely.
2. **Agent + App fusion** — Combining application building with autonomous agents in one platform is a strong architectural choice. Most competitors do one or the other.
3. **Integration breadth** — Wide connectivity out of the box with zero configuration is a real time-saver.
4. **Multi-party workspaces** — External user support for clients, partners, vendors is well thought out.
5. **Compliance early** — SOC 2 + ISO 27001 + GDPR at seed stage is impressive and signals enterprise readiness.
6. **monday.com DNA** — The founders understand workspace tooling deeply. The UX sensibility shows.

### What Blocks.diy Does NOT Do
1. **No domain depth whatsoever** — It knows nothing about financial data, accounting, KPIs, variance analysis, or scenario planning. It's a blank canvas.
2. **No governed data infrastructure** — No immutable audit trails, no data lineage, no human-in-the-loop approval gates. The "trust" is platform security (encryption, SOC 2), not output governance.
3. **No accounting integration** — No Xero, QuickBooks, or any accounting-specific pipeline. The "Financial Analyst" agent is just a label on a generic chatbot.
4. **No multi-party governance** — They have role-based access, but no governed workflows where an advisor reviews/approves before an SME sees something, or where an investor gets sandboxed scenario access.
5. **No data primitives** — No DrillableNumber, no assumption management, no universal colour coding for data provenance, no variance analysis engine.
6. **No playbook engine** — No structured progression framework grounded in real financial data.
7. **AI outputs are unaudited** — There's no governance layer ensuring AI-generated analysis has traceability, version history, or approval gates.
8. **Template marketplace is shallow** — Community templates are starter kits, not deep domain solutions.

---

## 4. Feature Comparison — Advisory OS vs Blocks.diy

| Capability | Blocks.diy | Advisory OS | Verdict |
|---|---|---|---|
| **Conversational builder** | Core feature — "Ella" builds apps from NL | Not a feature — purpose-built UI | LEARN from their UX for onboarding interview |
| **AI Agents with goals** | Pre-built roles, configurable goals, 24/7 triggers | Phase 2 — agent governance layer | STUDY their agent architecture |
| **Integration layer** | 100+ native, zero-config | Xero OAuth (Phase 1), provider-agnostic adapter (Phase 2) | Different scope — they're breadth, you're depth |
| **Built-in database** | Generic, AI-managed | Supabase with structured financial data model | BUILD — yours is domain-specific |
| **Custom UI per role** | AI-generated from prompts | Purpose-built role-scoped dashboards (SME, Advisor, Investor) | BUILD — governed views, not generic |
| **External portals** | Public pages, branded URLs | Virtual Data Room, Investor Portal with live data | BUILD — this is your VDR differentiator |
| **RBAC & permissions** | Standard role/permission system | Governed RBAC with audit trails on every access | BUILD — governance is your moat |
| **Collaboration workspaces** | Teams, clients, partners, vendors | Sharing, commenting, version control, activity feeds | BUILD — collaboration with governance |
| **AI Financial Analysis** | Generic "Financial Analyst" agent label | KPI engine, variance analysis, NL scenario engine, macro-to-micro intelligence | BUILD — this IS the product |
| **Accounting integration** | None | Xero OAuth pipeline, data model, KPI extraction | BUILD — foundational differentiator |
| **Audit trails** | None on AI outputs | Immutable logs on every output, version history, approval gates | BUILD — core thesis |
| **Data lineage** | None | Every number links to source via DrillableNumber | BUILD — Sprint 0 primitive |
| **Assumption management** | None | Assumptions Hub, inline editing, impact preview, dependency graph | BUILD — uncontested feature |
| **Scenario planning** | None (could be built by a user as a generic app) | NL scenario engine grounded in real accounting data | BUILD — confirmed competitive whitespace |
| **Playbook engine** | None | SLIQ/EOS-grounded progression framework | BUILD — architectural centre of gravity |
| **Board pack generation** | None | PDF generation from live data | BUILD — high-value advisor workflow |
| **Template marketplace** | Community-built starter templates | Not planned Phase 1 | CONSIDER for Phase 2/3 — advisor-built playbook templates |
| **Compliance certs** | SOC 2, ISO 27001, GDPR | Not yet (Supabase Auth + custom RBAC for MVP) | PRIORITISE — this accelerates enterprise sales |
| **Voice agents** | Coming soon (phone calls with AI) | Vapi.ai for onboarding interview | WATCH — voice agent tech is converging |
| **Code actions** | Coming soon (Ella writes backend) | Claude Code builds everything | N/A — different build model |

---

## 5. What We Can Replicate / Learn From

### 5.1 Agent Goal-Setting UX (REPLICATE the pattern)
Blocks lets users set agent goals, give instructions, define knowledge bases, and shape "thinking style." This is directly applicable to Advisory OS's advisor agent configuration. Instead of a generic agent, yours would be: **"Set your CFO agent's goals for this client → give it the client's Xero data as knowledge → shape its analysis style (conservative/aggressive) → watch it generate variance commentary."**

**Build ourselves?** Yes — but the UX pattern of goal/instruction/knowledge/style is worth replicating. The underlying engine is your Claude API + governed data, not a generic agent framework.

### 5.2 Conversational Onboarding (REPLICATE the interaction model)
Ella's conversational builder is essentially what your AI onboarding interview already plans to do. The pattern of: describe your situation → system asks clarifying questions → generates structured output is exactly right. Blocks validates this works.

**Build ourselves?** Already planned. Blocks confirms the approach.

### 5.3 Template/Playbook Marketplace (STUDY for Phase 2/3)
Community-built templates that can be deployed instantly or customised is a powerful distribution mechanism. For Advisory OS, this translates to: **advisor-built playbook templates** — a fractional CFO packages their proven improvement methodology as a deployable playbook that other advisors can use.

**Build ourselves?** Phase 2/3. But architect the playbook engine with marketplace distribution in mind from Day 1.

### 5.4 External User Portals with Custom URLs (REPLICATE)
Blocks lets you create branded public pages with custom URLs. This maps directly to the Advisory OS Virtual Data Room and Investor Portal. The insight: **branded, custom-URL portals that external parties (investors, board members) can access without platform accounts** is table-stakes UX.

**Build ourselves?** Yes — but the VDR is live data, not static pages. Their approach is a starting point for the wrapper.

### 5.5 Integration-First Philosophy (VALIDATE)
Blocks connects to existing tools rather than replacing them. This validates your own integration-first architecture and provider-agnostic adapter layer. Their breadth (100+ integrations) is achievable because they're using generic APIs. Your depth (Xero OAuth with full financial data model) is harder to replicate.

**Build ourselves?** Yes — depth over breadth. Xero + Google Workspace (Phase 1), Microsoft 365 (Phase 2).

### 5.6 Trust Center & Early Compliance (PRIORITISE)
SOC 2 + ISO 27001 + GDPR at seed stage is a power move, especially given their monday.com pedigree. For Advisory OS, where **trust through governance is the thesis**, having a published Trust Center with real compliance certifications is non-negotiable for enterprise advisor partnerships.

**Build ourselves?** Not the certs themselves — use a compliance automation platform (Vanta, Drata, Secureframe) to accelerate SOC 2 and ISO 27001. Build a Trust Center page early, even before full certification.

---

## 6. What We Should NOT Build (Leverage Instead)

### 6.1 Generic Agent Orchestration Framework
Don't build a generic agent framework. Blocks already does this, as do dozens of others (CrewAI, AutoGen, LangGraph). Advisory OS's agents should be **purpose-built financial intelligence agents** where the governance layer (audit trails, approval gates, human-in-the-loop) is the differentiation, not the orchestration engine.

### 6.2 100+ Integration Connectors
Don't try to match Blocks' integration breadth. Use Inngest + existing connector libraries. Focus on deep integrations that matter: Xero, Google Workspace, Slack, Stripe. Everything else is Phase 2/3.

### 6.3 No-Code App Builder
Advisory OS is NOT a no-code builder. This is a critical strategic distinction. Blocks lets anyone build anything. Advisory OS delivers a **specific, opinionated, governed financial intelligence experience**. The temptation to add "customise your own dashboard" or "build your own workflow" is a trap — it dilutes the product into another generic tool.

### 6.4 Community Template Marketplace (Phase 1)
Don't build marketplace infrastructure now. Focus on 3 alpha cohort clients. The marketplace is a Phase 2/3 growth mechanism, not a Phase 1 feature.

---

## 7. What We Absolutely Build Ourselves

These are the features where Advisory OS has **no viable leverage option** — they must be custom-built because they ARE the product:

1. **Governed Data Infrastructure** — Immutable audit trails, data lineage, version history, approval gates. This is the moat. Blocks doesn't have it. No horizontal platform does.

2. **Financial Data Primitives (Sprint 0)** — DrillableNumber, universal colour coding, assumption management system. These are the atoms everything else is built from.

3. **KPI Engine + Variance Analysis** — Xero data → structured KPIs → automated variance commentary via Claude API. Domain-specific, not replicable by a generic agent.

4. **NL Scenario Engine** — "What if revenue drops 15% and we delay hiring by 3 months?" grounded in real accounting data. Confirmed competitive whitespace.

5. **Playbook Engine** — SLIQ/EOS-grounded progression framework with maturity scoring. Potentially the architectural centre of gravity.

6. **Multi-Party Governed Workflows** — SME creates → Advisor reviews/approves → Investor sees sandboxed view. Each step audited. This is fundamentally different from Blocks' team collaboration.

7. **Virtual Data Room with Live Data** — Not static PDFs. Live rendering of financial data, AI Readiness Check before sharing, engagement analytics.

8. **AI Onboarding Interview** — Conversational intake that builds the client's financial profile from Xero data + interview responses. Chat-first, voice (Vapi.ai) after validation.

9. **Board Pack PDF Generation** — Automated, governed, versioned board packs from live data. High-value advisor workflow.

10. **Macro-to-Micro Intelligence Layer** — Connecting HMRC/Companies House/macro signals to the client's specific financials via Claude API.

---

## 8. Strategic Takeaways

### Blocks.diy is NOT a Competitor
They are a horizontal no-code platform. They will never go deep on financial intelligence, accounting integration, or governed advisory workflows. A user *could* build a crude financial dashboard on Blocks, but it would have no Xero integration, no data lineage, no governed audit trails, no domain-specific KPIs — and they'd be starting from scratch every time.

### Blocks.diy IS a Validation Signal
Their $10M raise, monday.com backing, and rapid adoption validate several patterns Advisory OS is already pursuing: conversational AI interfaces, agent-based automation, role-scoped access, external portals, integration-first architecture, and early compliance certification. You're not wrong about any of these.

### The Real Threat is Not Blocks — It's Kevin Steel / Inflectiv
Blocks is too horizontal to threaten Advisory OS. The real competitive pressure comes from vertical players like Kevin Steel's Inflectiv Intelligence (143 commits, 24 days, Claude Code — same stack as you, targeting the same UK fractional CFO persona). Blocks is a reference, not a rival.

### One Pattern Worth Stealing Immediately
**The agent goal/instruction/knowledge/style framework.** When Advisory OS builds its agent layer (Phase 2), the UX of letting an advisor configure an agent's goals, feed it client-specific knowledge, set its analytical style, and have it work autonomously with audit trails — that's the governed version of what Blocks does generically. Architect for this now even if you build it later.

---

## 9. Recommended Actions

| Priority | Action | Effort | Impact |
|---|---|---|---|
| **Now** | Study Blocks' agent UX — capture screenshots of goal-setting, knowledge base, trigger configuration | 2 hours | Informs Phase 2 agent architecture |
| **Now** | Add Blocks.diy to Notion competitive intelligence library (Competitors category) | 30 mins | Tracking |
| **Sprint 0** | Build financial data primitives — this is where the real gap between Advisory OS and every horizontal platform becomes unbridgeable | Planned | Foundational |
| **Phase 1** | Implement Trust Center page (even pre-certification) with governance philosophy | 1 day | Enterprise credibility |
| **Phase 1** | Evaluate Vanta/Drata/Secureframe for SOC 2 acceleration | 1 week | Unlocks enterprise sales |
| **Phase 2** | Design playbook marketplace architecture (template packaging, advisor attribution, deployment) | Architectural | Growth mechanism |
| **Phase 2** | Build governed agent layer using Blocks-informed UX patterns | Major | Advisor productivity multiplier |

---

*Bottom line: Blocks.diy is a well-executed horizontal platform that validates your architectural instincts. It poses zero competitive threat because it has zero domain depth. The governed financial intelligence shell you're building is categorically different — and categorically harder to replicate. Stay the course.*

---
---

# PART 2: AthenaGen AI — Full Platform Review

**URL:** https://www.athenagenai.com/  
**Type:** AI consulting/services company (NOT a self-serve product)

---

## 10. What AthenaGen AI Actually Is

AthenaGen AI is an **Athens-based AI services company** (with a UK phone number: +44 20 3769 3644) founded by three co-founders: Filippos Kyprios (Managing Director), Iasonas Kyprios (Growth Director), and Savvas Lazopoulos (CTO).

**Core proposition:** They act as a "specialised partner" — running a discovery workshop, designing a custom AI blueprint, then building and deploying bespoke AI agents that automate enterprise workflows. Everything is custom-built per client engagement.

**Business model:** Consulting services. No self-serve platform, no public pricing, no product you log into. Every engagement starts with "Book a Demo."

**Website:** Built on Wix. No evidence of significant funding or notable client logos.

**Target:** Enterprise organisations across all departments — explicitly horizontal but services-delivered rather than platform-delivered.

---

## 11. Architecture — "The Brain" + Specialist Agents

### 11.1 The Core Brain
- Central intelligence that analyses information across the organisation
- Creates step-by-step plans for agents to execute
- NL chat interface — managers ask questions, get "business-wide answers"
- Collects data from sources the client defines
- Communicates results and insights directly to users

### 11.2 Tailor-Made Agents
- Each agent is purpose-built for a specific function (sales, finance, operations, etc.)
- Agents integrate with existing tools to automate workflows
- AthenaGen's team builds and deploys the agents — not the client

### 11.3 Platform Capabilities (as marketed)
- **Total Visibility & Control** — real-time monitoring of every workflow, action, and result
- **Seamless Integration** — direct integration with CRM/ERP (Salesforce, SAP) via APIs
- **Human-Centric Automation** — choice between fully autonomous or human-in-the-loop review for critical decisions
- **On-Premise Deployment** — data stays on client's own servers
- **Granular Access Control** — role-based permissions per user
- **Compliance-Ready** — architected for GDPR, HIPAA, and other regulatory standards

---

## 12. Finance & Accounting Offering

AthenaGen's Finance & Accounting page reveals their scope is entirely **operational accounting automation**:

| Feature | What It Does | Advisory OS Equivalent |
|---|---|---|
| Automated Invoice Processing | Ingest invoices from email, extract data, 3-way matching in ERP | N/A — Xero handles this. Not our layer. |
| Intelligent Accounts Receivable | Monitor aging receivables, send automated payment reminders | Could be a Phase 2 automation via Inngest |
| Automated Bank Reconciliation | Ingest statements, match against GL, flag exceptions | N/A — Xero handles this |
| Custom Finance Solutions | Bespoke builds per client | This IS Advisory OS, but productised |

**Key insight:** AthenaGen automates what a bookkeeper does. Advisory OS delivers the strategic intelligence layer that sits above the books — KPI analysis, variance commentary, scenario planning, playbook-driven improvement, investor reporting. These are entirely different value propositions at different levels of the stack.

---

## 13. What's Relevant to Advisory OS

### 13.1 "Brain + Agents" Architecture Pattern (VALIDATED)
The central orchestrator directing specialist agents with human oversight is the same pattern Advisory OS is heading toward in Phase 2. AthenaGen proves this framing resonates with buyers. The difference: they deliver it as custom consulting; Advisory OS delivers it as governed infrastructure.

### 13.2 Human-in-the-Loop as a Headline Feature (VALIDATED)
They explicitly market the choice between autonomous and human-reviewed workflows. Their positioning: "Your team becomes workflow operators, not task executors." Advisory OS should adopt similar language but with the crucial addition: **every approval, review, and override is immutably logged with full audit trail.**

### 13.3 Data Sovereignty Messaging (BORROW)
"Your data, your servers" and "your proprietary data never leaves your servers" is their lead security message. Advisory OS should adapt this for the governed data pitch: *"Your financial data stays in your governed environment. Every access logged. Every output traceable. Every decision auditable."*

### 13.4 Consulting Sales Process → Onboarding Template (STUDY)
Their "Discover → Blueprint → Deploy" three-step engagement maps to Advisory OS's onboarding:

| AthenaGen Step | Advisory OS Equivalent |
|---|---|
| Discovery Workshop (manual, consultant-led) | AI Onboarding Interview (automated, chat → voice) |
| Custom AI Blueprint (consultant designs) | Auto-generated KPI dashboard + maturity assessment |
| Deploy & Scale (consultant builds and deploys) | Advisor activates playbooks + scenario engine |

The lesson: Advisory OS **automates what AthenaGen charges consulting fees for**. This is a powerful positioning message.

### 13.5 Department-by-Department Solution Pages (UX PATTERN)
Their site structure — a dedicated page per department with specific use cases, pain points, and agent examples — is a clean content marketing pattern. Advisory OS could adopt this for persona-based pages: "For SME Owners" / "For Fractional CFOs" / "For Investors" — each with specific pain points and platform capabilities.

---

## 14. What's NOT Relevant

- **On-premise deployment** — irrelevant for SME market. Supabase cloud with governed access is the right call.
- **Salesforce/SAP integration** — enterprise ERP, not your Phase 1. Xero is the priority.
- **Custom consulting delivery** — the entire business model is anti-scalable. You're building a product, not a consulting practice.
- **Generic agent building** — their agents are blank canvases custom-coded per client. Your agents are purpose-built with financial domain knowledge from Day 1.
- **Wix website** — not a technology signal worth studying.

---

## 15. Threat Assessment

**Threat level: None.**

AthenaGen is a small consulting shop with no product moat, no visible funding, no domain-specific IP, and no self-serve platform. If their three founders stopped working tomorrow, there'd be nothing to sell. They can't scale beyond the number of engagements their team can deliver manually. Advisory OS is building durable, scalable infrastructure — categorically different business.

---
---

# PART 3: Combined Lessons & Claude Code Implementation Summary

---

## 16. Key Architectural Lessons (Both Platforms)

### Lesson 1: "Central Brain + Specialist Agents + Human Oversight" is the converging market pattern
Both Blocks.diy and AthenaGen AI independently arrived at the same architecture: a central intelligence orchestrating domain-specific agents with configurable human-in-the-loop controls. Advisory OS should architect for this from Day 1, even if agent features ship in Phase 2.

**Implication for code:** The data model should include agent-related tables and governance hooks in the schema now, even if the UI isn't built yet. Every intelligence output should already flow through a governance checkpoint (even if it auto-approves in Phase 1).

### Lesson 2: Trust/Governance is the stated concern, but nobody has actually built it
Blocks.diy has platform-level security (SOC 2, encryption). AthenaGen has on-premise deployment. Neither has **output-level governance** — immutable audit trails on every AI-generated insight, data lineage from source to output, version history on every number, approval gates with traceability. This is Advisory OS's confirmed whitespace.

**Implication for code:** Sprint 0 data primitives (DrillableNumber, colour coding, assumption management) are not just UX features — they ARE the moat. Every competitor stops at platform security. Advisory OS goes to output governance.

### Lesson 3: The operational accounting layer is already being commoditised
AthenaGen automates invoices, reconciliation, and AR chasing. This is heading toward commodity pricing. Advisory OS is correct to let Xero handle the operational layer and focus on the strategic intelligence layer above it.

**Implication for code:** Do not build invoice processing, bank reconciliation, or basic bookkeeping automation. These are Xero's job. Advisory OS's Xero integration should pull structured data for KPI calculation, not try to automate data entry.

### Lesson 4: Agent goal/instruction/knowledge/style configuration is a proven UX pattern
Blocks.diy lets users define goals, instructions, knowledge bases, and thinking style for each agent. This is directly applicable to Advisory OS's advisor-configured agents.

**Implication for code:** When designing the agent governance schema, include fields for: goal (what the agent is trying to achieve), instructions (how it should behave), knowledge_scope (which client data it can access), analysis_style (conservative/moderate/aggressive), and approval_required (boolean + approver role).

### Lesson 5: Persona-specific onboarding and solution pages convert
Both platforms structure content by department/persona with specific pain points and capabilities. Advisory OS should adopt this for its marketing site and in-platform onboarding.

**Implication for code:** The onboarding flow should branch by persona (SME Owner vs Fractional CFO vs Investor) with different default dashboard configurations, KPI selections, and feature access per role.

---

## 17. Claude Code Actionable Summary

This section is designed to be dropped directly into CLAUDE.md or referenced as a spec addendum for Claude Code sessions.

### SCHEMA ADDITIONS (architect now, build when needed)

```
-- Agent governance tables (Phase 2, but schema-ready now)
-- Add to Supabase migration queue

CREATE TABLE IF NOT EXISTS agent_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID REFERENCES organisations(id),
  agent_type TEXT NOT NULL, -- 'financial_analyst', 'scenario_planner', 'variance_commentator', 'playbook_advisor'
  display_name TEXT NOT NULL,
  goal TEXT, -- What this agent is trying to achieve
  instructions TEXT, -- How it should behave
  knowledge_scope JSONB, -- Which data sources it can access
  analysis_style TEXT DEFAULT 'moderate', -- 'conservative', 'moderate', 'aggressive'
  approval_required BOOLEAN DEFAULT true,
  approver_role TEXT DEFAULT 'advisor', -- Role that must approve outputs
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS agent_outputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_config_id UUID REFERENCES agent_configs(id),
  organisation_id UUID REFERENCES organisations(id),
  output_type TEXT NOT NULL, -- 'variance_commentary', 'scenario_result', 'kpi_insight', 'playbook_recommendation'
  output_content JSONB NOT NULL,
  model_used TEXT NOT NULL, -- 'claude-sonnet-4-20250514', etc.
  prompt_hash TEXT, -- Hash of the prompt for reproducibility
  data_sources JSONB, -- Array of source references for data lineage
  governance_status TEXT DEFAULT 'pending', -- 'pending', 'auto_approved', 'human_approved', 'rejected'
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  audit_trail JSONB DEFAULT '[]', -- Immutable log of all status changes
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast governance queries
CREATE INDEX idx_agent_outputs_governance ON agent_outputs(organisation_id, governance_status, created_at DESC);
```

### GOVERNANCE CHECKPOINT PATTERN (implement in Phase 1)

Every Claude API call for intelligence outputs should flow through this pattern:

```typescript
// /lib/governance/checkpoint.ts

interface GovernanceCheckpoint {
  organisationId: string;
  outputType: 'variance_commentary' | 'scenario_result' | 'kpi_insight' | 'playbook_recommendation';
  content: any;
  dataSources: DataSourceReference[];
  modelUsed: string;
  promptHash: string;
}

async function governedOutput(checkpoint: GovernanceCheckpoint): Promise<GovernedResult> {
  // 1. Log the output with full data lineage
  const output = await db.agent_outputs.insert({
    ...checkpoint,
    governance_status: 'pending',
    audit_trail: [{
      action: 'created',
      timestamp: new Date().toISOString(),
      actor: 'system',
      details: { model: checkpoint.modelUsed, sources: checkpoint.dataSources.length }
    }]
  });

  // 2. Check if auto-approval is configured for this output type
  const config = await getGovernanceConfig(checkpoint.organisationId, checkpoint.outputType);
  
  if (config.autoApprove) {
    await approveOutput(output.id, 'system', 'auto_approved');
    return { status: 'approved', output };
  }

  // 3. Queue for human review
  await notifyApprover(config.approverRole, output.id);
  return { status: 'pending_review', output };
}
```

### ONBOARDING FLOW — PERSONA BRANCHING

```typescript
// The onboarding interview should branch by persona early

type UserPersona = 'sme_owner' | 'fractional_cfo' | 'investor';

interface OnboardingConfig {
  persona: UserPersona;
  defaultDashboard: string; // Dashboard layout template
  defaultKPIs: string[]; // Pre-selected KPI set
  featureAccess: string[]; // Which modules are visible
  onboardingQuestions: OnboardingQuestion[]; // Persona-specific questions
}

const PERSONA_CONFIGS: Record<UserPersona, OnboardingConfig> = {
  sme_owner: {
    defaultDashboard: 'owner-overview',
    defaultKPIs: ['revenue_growth', 'cash_runway', 'gross_margin', 'burn_rate'],
    featureAccess: ['dashboard', 'scenarios', 'knowledge_vault'],
    onboardingQuestions: [/* business context, goals, pain points */]
  },
  fractional_cfo: {
    defaultDashboard: 'advisor-multi-client',
    defaultKPIs: ['all'], // Full KPI access
    featureAccess: ['dashboard', 'scenarios', 'playbooks', 'board_packs', 'knowledge_vault', 'client_management'],
    onboardingQuestions: [/* client portfolio, advisory methodology, reporting preferences */]
  },
  investor: {
    defaultDashboard: 'portfolio-overview',
    defaultKPIs: ['revenue_growth', 'burn_rate', 'ltv_cac', 'runway'],
    featureAccess: ['dashboard', 'scenarios_sandboxed', 'knowledge_vault_readonly'],
    onboardingQuestions: [/* portfolio scope, reporting cadence, key metrics */]
  }
};
```

### DATA LINEAGE ON EVERY NUMBER (Sprint 0 — reinforce)

```typescript
// Every number rendered on the platform MUST carry provenance metadata
// This is what separates Advisory OS from every competitor reviewed

interface DrillableNumberProps {
  value: number;
  source: DataSource; // Where this number came from
  type: 'actual' | 'forecast' | 'assumption' | 'calculated' | 'linked' | 'zero_not_pulled';
  lineage: LineageStep[]; // Full chain from source to display
  lastUpdated: string;
  modifiedBy?: string; // If manually adjusted
  justification?: string; // Why it was changed
}

interface LineageStep {
  stepType: 'xero_pull' | 'kpi_calculation' | 'scenario_adjustment' | 'manual_override' | 'claude_generated';
  timestamp: string;
  actor: string; // 'system' | userId
  details: Record<string, any>;
  auditId: string; // Link to immutable audit log
}
```

### TRUST CENTER PAGE (Phase 1 — build early)

Create a `/trust` page on the marketing site with:
- Governance philosophy statement ("Every number traceable. Every output auditable. Every decision logged.")
- Data handling practices (Supabase, encryption at rest and in transit)
- Role-based access control description
- Audit trail capabilities
- Compliance roadmap (SOC 2 target date, GDPR compliance status)
- Data lineage explanation with visual diagram

This page exists before full certification. It signals intent and differentiates from every competitor reviewed — none of whom have output-level governance.

### MARKETING SITE — PERSONA PAGES (Phase 1)

Structure the marketing site with dedicated landing pages per persona:

```
/for/business-owners    → Pain: "I don't know my numbers. I get reports too late to act."
/for/fractional-cfos    → Pain: "I manage 5+ clients with spreadsheets and can't scale."
/for/investors          → Pain: "I have no real-time visibility into portfolio companies."
```

Each page should include:
- 3 specific pain points (drawn from competitive analysis)
- How Advisory OS solves each (with screenshots when available)
- Social proof / alpha cohort examples
- CTA to onboarding interview (persona-specific entry point)

### COMPETITIVE POSITIONING STATEMENT

For use in pitch decks, marketing copy, and investor materials:

> "Consulting firms like AthenaGen charge £50k+ to manually build AI automations per client. Horizontal platforms like Blocks.diy let you build generic tools. Advisory OS is the only platform that delivers governed financial intelligence — where every number is traceable, every AI insight is auditable, and every advisor action is logged — as self-serve infrastructure that scales without consultants."

---

## 18. Updated Competitive Landscape Map

| Platform | Type | Domain | Moat | Threat to Advisory OS |
|---|---|---|---|---|
| **Blocks.diy** | Horizontal no-code + agents | Any | Conversational builder UX, integration breadth, monday.com backing | None — no financial domain depth |
| **AthenaGen AI** | Consulting/services | Any (enterprise) | Team expertise (fragile) | None — services, not product |
| **Kevin Steel / Inflectiv** | Vertical FP&A tool | UK fractional CFO | Same stack, same persona, fast builder | **Medium** — closest competitor |
| **Finstory.ai (Joost)** | Vertical financial storytelling | SME finance | Narrative-first approach | **Low-Medium** — adjacent positioning |
| **DataRails / Runway / Jirav** | FP&A platforms | Finance teams | Deep integrations, established customer base | **Low** — enterprise focus, not advisor-first |
| **Advisory OS** | Governed financial intelligence | SME + Advisors + Investors | Output governance, data lineage, multi-party workflows, playbook engine | **This is us** |

---

*Both platforms reviewed confirm that Advisory OS's architectural direction is correct. The market is converging on central intelligence + specialist agents + human oversight — but nobody has built the governed output layer. Sprint 0 data primitives are the foundation that makes everything else defensible. Build them first, build them right.*
