import Anthropic from '@anthropic-ai/sdk';
import { trackTokenUsage, estimateCostUsd } from '@/lib/ai/token-budget';

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured');
    client = new Anthropic({ apiKey });
  }
  return client;
}

// ---------------------------------------------------------------------------
// Model routing — use the cheapest model that can do the job
// ---------------------------------------------------------------------------

export type ModelTier = 'haiku' | 'sonnet' | 'opus';

const MODEL_MAP: Record<ModelTier, string> = {
  haiku: 'claude-haiku-4-20250414',
  sonnet: 'claude-sonnet-4-20250514',
  opus: 'claude-opus-4-20250514',
};

/**
 * Choose the right model tier for the task.
 *
 * - haiku:  Simple generation, reformatting, classification, one-liners.
 *           ~20x cheaper than Opus. Use for: explain, account mapping,
 *           KPI micro-commentary, chart type selection, alert summaries.
 *
 * - sonnet: Multi-step reasoning, variance explanations, period narratives,
 *           trend analysis, custom KPI definition, interview follow-ups.
 *           Default model — good balance of quality and cost.
 *
 * - opus:   Complex synthesis, board pack generation, multi-scenario
 *           comparison, strategic recommendations. Only when needed.
 */
export function getModelId(tier: ModelTier = 'sonnet'): string {
  return MODEL_MAP[tier];
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CallLLMInput = {
  systemPrompt: string;
  userMessage: string;
  temperature?: number;
  /** Model tier — defaults to 'sonnet'. Use 'haiku' for simple tasks. */
  model?: ModelTier;
  /** Max tokens for the response. Defaults to 2048. */
  maxTokens?: number;
  /**
   * Enable Anthropic prompt caching on the system prompt.
   * When true, the system prompt is sent with cache_control: { type: "ephemeral" }
   * so repeated calls within 5 minutes pay ~90% less for the system prompt.
   * Use when the same system prompt is sent multiple times (e.g. company skill).
   */
  cacheSystemPrompt?: boolean;
  /** Org ID — if provided, granular usage is tracked automatically. */
  orgId?: string;
  /** User ID — passed through to token tracking for per-user analytics. */
  userId?: string;
  /** Endpoint name — identifies the feature consuming tokens (e.g. 'explain', 'narrative'). */
  endpoint?: string;
};

type ConversationMessage = {
  role: 'user' | 'assistant';
  content: string;
};

type CallLLMConversationInput = {
  systemPrompt: string;
  messages: ConversationMessage[];
  temperature?: number;
  maxTokens?: number;
  /** Model tier — defaults to 'sonnet'. */
  model?: ModelTier;
  /** Enable Anthropic prompt caching on the system prompt. */
  cacheSystemPrompt?: boolean;
};

export type LLMResponse = {
  text: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
};

// ---------------------------------------------------------------------------
// Core LLM call
// ---------------------------------------------------------------------------

/**
 * Call the Anthropic LLM. Returns text + actual token usage from the API.
 *
 * Supports:
 * - Model routing (haiku/sonnet/opus)
 * - Anthropic prompt caching (cache_control on system prompt)
 * - Configurable max_tokens
 */
export async function callLLM({
  systemPrompt,
  userMessage,
  temperature = 0.2,
  model = 'sonnet',
  maxTokens = 2048,
  cacheSystemPrompt = false,
}: CallLLMInput): Promise<string> {
  const anthropic = getClient();

  // Build system parameter — with or without prompt caching
  const system: Anthropic.MessageCreateParams['system'] = cacheSystemPrompt
    ? [
        {
          type: 'text' as const,
          text: systemPrompt,
          cache_control: { type: 'ephemeral' as const },
        },
      ]
    : systemPrompt;

  const response = await anthropic.messages.create({
    model: getModelId(model),
    max_tokens: maxTokens,
    temperature,
    system,
    messages: [{ role: 'user', content: userMessage }],
  });

  const textBlock = response.content.find((block) => block.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text response from LLM');
  }

  return textBlock.text;
}

/**
 * Call the Anthropic LLM and return detailed response including token usage.
 * Use when you need actual token counts for budget tracking.
 */
export async function callLLMWithUsage({
  systemPrompt,
  userMessage,
  temperature = 0.2,
  model = 'sonnet',
  maxTokens = 2048,
  cacheSystemPrompt = false,
  orgId,
  userId,
  endpoint,
}: CallLLMInput): Promise<LLMResponse> {
  const anthropic = getClient();

  const system: Anthropic.MessageCreateParams['system'] = cacheSystemPrompt
    ? [
        {
          type: 'text' as const,
          text: systemPrompt,
          cache_control: { type: 'ephemeral' as const },
        },
      ]
    : systemPrompt;

  const response = await anthropic.messages.create({
    model: getModelId(model),
    max_tokens: maxTokens,
    temperature,
    system,
    messages: [{ role: 'user', content: userMessage }],
  });

  const textBlock = response.content.find((block) => block.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text response from LLM');
  }

  const usage = response.usage as unknown as Record<string, number>;

  const inputTokens = usage.input_tokens ?? 0;
  const outputTokens = usage.output_tokens ?? 0;
  const cacheReadTokens = usage.cache_read_input_tokens ?? 0;
  const cacheCreationTokens = usage.cache_creation_input_tokens ?? 0;
  const totalTokens = inputTokens + outputTokens;

  // Track granular usage if orgId is provided
  if (orgId && endpoint) {
    await trackTokenUsage(orgId, totalTokens, endpoint, {
      userId,
      model,
      inputTokens,
      outputTokens,
      cacheReadTokens,
      cacheCreationTokens,
      estimatedCostUsd: estimateCostUsd(model, inputTokens, outputTokens, cacheReadTokens),
    });
  }

  return {
    text: textBlock.text,
    inputTokens,
    outputTokens,
    cacheReadTokens,
    cacheCreationTokens,
  };
}

/**
 * Call the Anthropic LLM with a full conversation history.
 * Supports multi-turn conversations for interview flows.
 */
export async function callLLMConversation({
  systemPrompt,
  messages,
  temperature = 0.4,
  maxTokens = 2048,
  model = 'sonnet',
  cacheSystemPrompt = false,
}: CallLLMConversationInput): Promise<string> {
  const anthropic = getClient();

  const system: Anthropic.MessageCreateParams['system'] = cacheSystemPrompt
    ? [
        {
          type: 'text' as const,
          text: systemPrompt,
          cache_control: { type: 'ephemeral' as const },
        },
      ]
    : systemPrompt;

  const response = await anthropic.messages.create({
    model: getModelId(model),
    max_tokens: maxTokens,
    temperature,
    system,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
  });

  const textBlock = response.content.find((block) => block.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text response from LLM');
  }

  return textBlock.text;
}
