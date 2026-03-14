import Anthropic from '@anthropic-ai/sdk';

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured');
    client = new Anthropic({ apiKey });
  }
  return client;
}

type CallLLMInput = {
  systemPrompt: string;
  userMessage: string;
  temperature?: number;
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
};

/**
 * Call the Anthropic LLM. Returns raw text response.
 * Model: claude-sonnet-4-20250514, temperature 0.2, max_tokens 2048.
 */
export async function callLLM({
  systemPrompt,
  userMessage,
  temperature = 0.2,
}: CallLLMInput): Promise<string> {
  const anthropic = getClient();

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2048,
    temperature,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  });

  const textBlock = response.content.find((block) => block.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text response from LLM');
  }

  return textBlock.text;
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
}: CallLLMConversationInput): Promise<string> {
  const anthropic = getClient();

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: maxTokens,
    temperature,
    system: systemPrompt,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
  });

  const textBlock = response.content.find((block) => block.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text response from LLM');
  }

  return textBlock.text;
}
