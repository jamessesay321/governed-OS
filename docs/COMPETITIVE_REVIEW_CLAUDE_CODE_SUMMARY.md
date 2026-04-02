# COMPETITIVE REVIEW — CLAUDE CODE ACTION ITEMS
# Source: Blocks.diy & AthenaGen AI platform reviews (1 April 2026)
# Reference: BLOCKS_DIY_ANALYSIS.md for full strategic context

## CONTEXT

Two platforms reviewed confirm the market is converging on:
- Central intelligence + specialist agents + human oversight
- Integration-first architecture
- Role-based access with external user portals
- NL interfaces for non-technical users

**Neither platform has output-level governance.** No immutable audit trails on AI outputs. No data lineage from source to displayed number. No governed approval workflows with traceability. This is Advisory OS's confirmed moat.

---

## PRIORITY 1: SPRINT 0 DATA PRIMITIVES (these ARE the moat)

Every competitor stops at platform security (encryption, SOC 2). Advisory OS goes to output governance. Sprint 0 primitives must be implemented before any other module UI.

### DrillableNumber — every number carries provenance

```typescript
interface DrillableNumberProps {
  value: number;
  source: DataSource;
  type: 'actual' | 'forecast' | 'assumption' | 'calculated' | 'linked' | 'zero_not_pulled';
  lineage: LineageStep[];
  lastUpdated: string;
  modifiedBy?: string;
  justification?: string;
}

interface LineageStep {
  stepType: 'xero_pull' | 'kpi_calculation' | 'scenario_adjustment' | 'manual_override' | 'claude_generated';
  timestamp: string;
  actor: string; // 'system' | userId
  details: Record<string, any>;
  auditId: string;
}
```

### Universal colour coding for number types
- Actual (from Xero) = one colour
- Forecast = another
- Assumption = another
- Calculated = another
- Linked (from another module) = another
- Zero / not pulled = another

### Assumption Management System
- Assumptions Hub (central registry)
- Inline editing with justification capture
- Real-time impact preview
- Dependency graph
- Assumption locking

---

## PRIORITY 2: GOVERNANCE CHECKPOINT PATTERN

Every Claude API call for intelligence outputs MUST flow through a governance checkpoint. Implement this pattern in Phase 1 even if all outputs auto-approve initially. The audit trail infrastructure must exist from Day 1.

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

  // 2. Check if auto-approval is configured
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

---

## PRIORITY 3: SCHEMA ADDITIONS (architect now, build when needed)

### Agent governance tables — add to Supabase migration queue

```sql
CREATE TABLE IF NOT EXISTS agent_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID REFERENCES organisations(id),
  agent_type TEXT NOT NULL,
  display_name TEXT NOT NULL,
  goal TEXT,
  instructions TEXT,
  knowledge_scope JSONB,
  analysis_style TEXT DEFAULT 'moderate',
  approval_required BOOLEAN DEFAULT true,
  approver_role TEXT DEFAULT 'advisor',
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS agent_outputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_config_id UUID REFERENCES agent_configs(id),
  organisation_id UUID REFERENCES organisations(id),
  output_type TEXT NOT NULL,
  output_content JSONB NOT NULL,
  model_used TEXT NOT NULL,
  prompt_hash TEXT,
  data_sources JSONB,
  governance_status TEXT DEFAULT 'pending',
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  audit_trail JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_agent_outputs_governance 
  ON agent_outputs(organisation_id, governance_status, created_at DESC);
```

**Note:** These tables support the Phase 2 agent layer but should be included in the schema migration plan now so they don't conflict with Phase 1 table structures. The `agent_outputs` table pattern should also be used for ALL Claude API intelligence outputs in Phase 1 (variance commentary, KPI insights, etc.) even before formal agents exist.

---

## PRIORITY 4: ONBOARDING PERSONA BRANCHING

The onboarding interview should branch early by persona. Both platforms reviewed structure their offering by department/role — Advisory OS should do the same for the in-platform experience.

```typescript
type UserPersona = 'sme_owner' | 'fractional_cfo' | 'investor';

const PERSONA_CONFIGS: Record<UserPersona, {
  defaultDashboard: string;
  defaultKPIs: string[];
  featureAccess: string[];
}> = {
  sme_owner: {
    defaultDashboard: 'owner-overview',
    defaultKPIs: ['revenue_growth', 'cash_runway', 'gross_margin', 'burn_rate'],
    featureAccess: ['dashboard', 'scenarios', 'knowledge_vault']
  },
  fractional_cfo: {
    defaultDashboard: 'advisor-multi-client',
    defaultKPIs: ['all'],
    featureAccess: ['dashboard', 'scenarios', 'playbooks', 'board_packs', 'knowledge_vault', 'client_management']
  },
  investor: {
    defaultDashboard: 'portfolio-overview',
    defaultKPIs: ['revenue_growth', 'burn_rate', 'ltv_cac', 'runway'],
    featureAccess: ['dashboard', 'scenarios_sandboxed', 'knowledge_vault_readonly']
  }
};
```

---

## PRIORITY 5: TRUST CENTER PAGE

Create `/trust` route with:
- Governance philosophy statement
- Data handling practices (Supabase, encryption)
- RBAC description
- Audit trail capabilities
- Compliance roadmap (SOC 2 target date)
- Data lineage visual diagram
- Trust differentiator vs competitors: "Every number traceable. Every output auditable. Every decision logged."

This should exist as a static page before full certification. It signals intent and differentiates.

---

## WHAT NOT TO BUILD (validated by competitive review)

- **DO NOT** build invoice processing, bank reconciliation, or AR automation → Xero handles this
- **DO NOT** build a generic no-code app builder → Advisory OS is opinionated, purpose-built
- **DO NOT** build a generic agent orchestration framework → Use Claude API directly with governance wrapper
- **DO NOT** try to match integration breadth (100+ connectors) → Depth on Xero, Google Workspace, Slack, Stripe
- **DO NOT** build a template marketplace in Phase 1 → Architect playbook engine with marketplace in mind, build marketplace in Phase 2/3

---

## MARKETING SITE STRUCTURE (for when it's built)

```
/for/business-owners    → "I don't know my numbers. Reports come too late."
/for/fractional-cfos    → "I manage 5+ clients with spreadsheets. I can't scale."
/for/investors          → "I have no real-time visibility into portfolio companies."
/trust                  → Governance philosophy + compliance roadmap
```

---

## KEY POSITIONING LINE

> "Consulting firms charge £50k+ to manually build AI automations per client. Horizontal platforms let you build generic tools. Advisory OS is the only platform that delivers governed financial intelligence — where every number is traceable, every AI insight is auditable, and every advisor action is logged — as self-serve infrastructure that scales without consultants."
