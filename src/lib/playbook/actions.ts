import { callLLM } from '@/lib/ai/llm';
import type {
  PlaybookAction,
  PlaybookAssessment,
  ActionStatus,
  ActionPriority,
} from '@/types/playbook';

/**
 * Generate recommended actions from an assessment.
 * Uses AI to create contextual, actionable recommendations
 * based on the lowest-scoring dimensions.
 */
export async function generateActions(
  assessment: PlaybookAssessment
): Promise<PlaybookAction[]> {
  // Sort dimensions by score (lowest first)
  const sorted = [...assessment.dimensionScores].sort(
    (a, b) => a.score - b.score
  );

  // Generate actions for the 3 lowest-scoring dimensions
  const targetDimensions = sorted.slice(0, 3);

  try {
    const actionsJson = await callLLM({
      systemPrompt: `You are a senior business advisor creating an action plan for an SME.
Generate specific, actionable recommendations based on the dimension scores provided.

Return a JSON array of actions. Each action must have:
- "dimensionId": string (use the provided dimension ID)
- "dimensionName": string
- "title": string (concise action title, max 80 chars)
- "description": string (2-3 sentences explaining what to do and why)
- "priority": "high" | "medium" | "low"
- "daysToComplete": number (estimated days)

Generate 2-3 actions per dimension. Prioritise based on impact.
Return ONLY valid JSON array, no markdown, no explanation.`,
      userMessage: `Assessment for organisation "${assessment.orgId}":
Overall score: ${assessment.overallScore.toFixed(1)}/5 (${assessment.overallLabel})

Dimensions needing improvement:
${targetDimensions
  .map(
    (d) =>
      `- ${d.dimensionName} (ID: ${d.dimensionId}): Level ${d.score}/5 (${d.label})
   KPI values: ${JSON.stringify(d.kpiValues)}
   Reasoning: ${d.reasoning}`
  )
  .join('\n')}

Generate actionable recommendations for these dimensions.`,
    });

    // Parse AI response
    const parsed = JSON.parse(actionsJson) as Array<{
      dimensionId: string;
      dimensionName: string;
      title: string;
      description: string;
      priority: ActionPriority;
      daysToComplete: number;
    }>;

    const now = new Date();

    return parsed.map((action, index) => {
      const dueDate = new Date(now);
      dueDate.setDate(dueDate.getDate() + (action.daysToComplete || 30));

      return {
        id: `action-${assessment.id}-${index}`,
        orgId: assessment.orgId,
        assessmentId: assessment.id,
        dimensionId: action.dimensionId,
        dimensionName: action.dimensionName,
        title: action.title,
        description: action.description,
        priority: action.priority,
        status: 'pending' as ActionStatus,
        dueDate: dueDate.toISOString(),
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      };
    });
  } catch {
    // Fallback: generate basic actions without AI
    return targetDimensions.map((dim, index) => ({
      id: `action-${assessment.id}-${index}`,
      orgId: assessment.orgId,
      assessmentId: assessment.id,
      dimensionId: dim.dimensionId,
      dimensionName: dim.dimensionName,
      title: `Improve ${dim.dimensionName}`,
      description: `Your ${dim.dimensionName} score is Level ${dim.score}/5 (${dim.label}). Review the key metrics and develop a plan to reach the next maturity level.`,
      priority: (dim.score <= 2 ? 'high' : 'medium') as ActionPriority,
      status: 'pending' as ActionStatus,
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
  }
}

/**
 * Update the status of an action.
 */
export function updateActionStatus(
  action: PlaybookAction,
  status: ActionStatus
): PlaybookAction {
  return {
    ...action,
    status,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Get all actions for an org, sorted by priority.
 */
export function sortActionsByPriority(
  actions: PlaybookAction[]
): PlaybookAction[] {
  const priorityOrder: Record<ActionPriority, number> = {
    high: 0,
    medium: 1,
    low: 2,
  };

  return [...actions].sort(
    (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
  );
}
