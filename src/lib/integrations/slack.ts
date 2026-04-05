/**
 * Slack Web API client for Grove (Governed OS).
 *
 * Uses the Slack Web API directly (https://slack.com/api) with a bot token.
 * Auth: Authorization: Bearer {SLACK_BOT_TOKEN}
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SlackChannel {
  id: string;
  name: string;
  is_channel: boolean;
  is_private: boolean;
  is_member: boolean;
  num_members?: number;
  topic?: { value: string };
  purpose?: { value: string };
}

export interface SlackMessage {
  ts: string;
  text: string;
  user?: string;
  bot_id?: string;
  blocks?: SlackBlock[];
  channel?: string;
}

export type SlackBlockType =
  | 'section'
  | 'header'
  | 'divider'
  | 'context'
  | 'actions'
  | 'rich_text';

export interface SlackBlock {
  type: SlackBlockType;
  text?: SlackTextObject;
  fields?: SlackTextObject[];
  elements?: (SlackElement | SlackTextObject)[];
  accessory?: SlackElement;
  block_id?: string;
}

export interface SlackTextObject {
  type: 'mrkdwn' | 'plain_text';
  text: string;
  emoji?: boolean;
}

export interface SlackElement {
  type: string;
  text?: SlackTextObject;
  url?: string;
  action_id?: string;
  value?: string;
  [key: string]: unknown;
}

interface SlackApiResponse {
  ok: boolean;
  error?: string;
  channels?: SlackChannel[];
  messages?: SlackMessage[];
  channel?: string;
  ts?: string;
  response_metadata?: { next_cursor?: string };
}

export interface BriefingData {
  orgName: string;
  date: string;
  revenue?: { current: number; previous: number; currency: string };
  cashPosition?: { balance: number; currency: string };
  kpis?: Array<{ name: string; value: string; trend: 'up' | 'down' | 'flat'; status: 'green' | 'amber' | 'red' }>;
  alerts?: Array<{ severity: 'critical' | 'warning' | 'info'; message: string }>;
  narrative?: string;
}

export interface AlertData {
  orgName: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  metric?: string;
  value?: string;
  threshold?: string;
  actionUrl?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getBotToken(): string {
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) {
    throw new Error('SLACK_BOT_TOKEN is not configured');
  }
  return token;
}

async function slackApi<T extends SlackApiResponse>(
  method: string,
  body?: Record<string, unknown>,
): Promise<T> {
  const token = getBotToken();
  const url = `https://slack.com/api/${method}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    throw new Error(`Slack API HTTP error: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as T;
  if (!data.ok) {
    throw new Error(`Slack API error: ${data.error ?? 'unknown_error'}`);
  }

  return data;
}

// ---------------------------------------------------------------------------
// Block Builder Helpers
// ---------------------------------------------------------------------------

export function headerBlock(text: string): SlackBlock {
  return {
    type: 'header',
    text: { type: 'plain_text', text, emoji: true },
  };
}

export function sectionBlock(text: string): SlackBlock {
  return {
    type: 'section',
    text: { type: 'mrkdwn', text },
  };
}

export function fieldsBlock(fields: Array<{ label: string; value: string }>): SlackBlock {
  return {
    type: 'section',
    fields: fields.map((f) => ({
      type: 'mrkdwn' as const,
      text: `*${f.label}*\n${f.value}`,
    })),
  };
}

export function dividerBlock(): SlackBlock {
  return { type: 'divider' };
}

export function contextBlock(text: string): SlackBlock {
  return {
    type: 'context',
    elements: [{ type: 'mrkdwn', text }],
  };
}

export function kpiCardBlock(
  name: string,
  value: string,
  trend: 'up' | 'down' | 'flat',
  status: 'green' | 'amber' | 'red',
): SlackBlock {
  const trendIcon = trend === 'up' ? ':arrow_up:' : trend === 'down' ? ':arrow_down:' : ':arrow_right:';
  const statusIcon = status === 'green' ? ':large_green_circle:' : status === 'amber' ? ':large_orange_circle:' : ':red_circle:';
  return sectionBlock(`${statusIcon} *${name}*: ${value} ${trendIcon}`);
}

export function alertBlock(severity: 'critical' | 'warning' | 'info', message: string): SlackBlock {
  const icon =
    severity === 'critical'
      ? ':rotating_light:'
      : severity === 'warning'
        ? ':warning:'
        : ':information_source:';
  return sectionBlock(`${icon} ${message}`);
}

// ---------------------------------------------------------------------------
// Briefing Block Builder
// ---------------------------------------------------------------------------

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function buildBriefingBlocks(data: BriefingData): SlackBlock[] {
  const blocks: SlackBlock[] = [];

  blocks.push(headerBlock(`Grove Daily Briefing - ${data.orgName}`));
  blocks.push(contextBlock(data.date));
  blocks.push(dividerBlock());

  if (data.narrative) {
    blocks.push(sectionBlock(data.narrative));
    blocks.push(dividerBlock());
  }

  // Revenue
  if (data.revenue) {
    const change = data.revenue.previous
      ? ((data.revenue.current - data.revenue.previous) / data.revenue.previous) * 100
      : 0;
    const trend = change > 0 ? ':arrow_up:' : change < 0 ? ':arrow_down:' : ':arrow_right:';
    blocks.push(
      fieldsBlock([
        { label: 'Revenue', value: formatCurrency(data.revenue.current, data.revenue.currency) },
        { label: 'vs Previous', value: `${change >= 0 ? '+' : ''}${change.toFixed(1)}% ${trend}` },
      ]),
    );
  }

  // Cash position
  if (data.cashPosition) {
    blocks.push(
      fieldsBlock([
        { label: 'Cash Position', value: formatCurrency(data.cashPosition.balance, data.cashPosition.currency) },
      ]),
    );
  }

  // KPIs
  if (data.kpis && data.kpis.length > 0) {
    blocks.push(dividerBlock());
    blocks.push(sectionBlock('*Key Performance Indicators*'));
    for (const kpi of data.kpis) {
      blocks.push(kpiCardBlock(kpi.name, kpi.value, kpi.trend, kpi.status));
    }
  }

  // Alerts
  if (data.alerts && data.alerts.length > 0) {
    blocks.push(dividerBlock());
    blocks.push(sectionBlock('*Alerts*'));
    for (const a of data.alerts) {
      blocks.push(alertBlock(a.severity, a.message));
    }
  }

  blocks.push(dividerBlock());
  blocks.push(contextBlock('Sent by Grove | Governed OS'));

  return blocks;
}

// ---------------------------------------------------------------------------
// Alert Block Builder
// ---------------------------------------------------------------------------

function buildAlertBlocks(data: AlertData): SlackBlock[] {
  const icon =
    data.severity === 'critical'
      ? ':rotating_light:'
      : data.severity === 'warning'
        ? ':warning:'
        : ':information_source:';

  const blocks: SlackBlock[] = [
    headerBlock(`${icon} ${data.title}`),
    contextBlock(`${data.orgName} | ${data.severity.toUpperCase()}`),
    dividerBlock(),
    sectionBlock(data.description),
  ];

  if (data.metric && data.value) {
    const fields = [
      { label: 'Metric', value: data.metric },
      { label: 'Current Value', value: data.value },
    ];
    if (data.threshold) {
      fields.push({ label: 'Threshold', value: data.threshold });
    }
    blocks.push(fieldsBlock(fields));
  }

  if (data.actionUrl) {
    blocks.push({
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: { type: 'plain_text', text: 'View in Grove', emoji: true },
          url: data.actionUrl,
          action_id: 'view_in_grove',
        },
      ],
    });
  }

  blocks.push(dividerBlock());
  blocks.push(contextBlock('Sent by Grove | Governed OS'));

  return blocks;
}

// ---------------------------------------------------------------------------
// Public API Functions
// ---------------------------------------------------------------------------

/**
 * Send a message to a Slack channel.
 */
export async function sendMessage(
  channel: string,
  text: string,
  blocks?: SlackBlock[],
): Promise<{ channel: string; ts: string }> {
  const data = await slackApi<SlackApiResponse>('chat.postMessage', {
    channel,
    text,
    ...(blocks ? { blocks } : {}),
  });
  return { channel: data.channel ?? channel, ts: data.ts ?? '' };
}

/**
 * List public channels the bot is a member of (or can join).
 */
export async function listChannels(): Promise<SlackChannel[]> {
  const data = await slackApi<SlackApiResponse>('conversations.list', {
    types: 'public_channel,private_channel',
    exclude_archived: true,
    limit: 200,
  });
  return data.channels ?? [];
}

/**
 * Post a daily financial briefing to a Slack channel.
 */
export async function postBriefing(
  channel: string,
  briefingData: BriefingData,
): Promise<{ channel: string; ts: string }> {
  const blocks = buildBriefingBlocks(briefingData);
  const fallback = `Grove Daily Briefing - ${briefingData.orgName} (${briefingData.date})`;
  return sendMessage(channel, fallback, blocks);
}

/**
 * Post an alert notification to a Slack channel.
 */
export async function postAlert(
  channel: string,
  alertData: AlertData,
): Promise<{ channel: string; ts: string }> {
  const blocks = buildAlertBlocks(alertData);
  const fallback = `[${alertData.severity.toUpperCase()}] ${alertData.title} - ${alertData.orgName}`;
  return sendMessage(channel, fallback, blocks);
}

/**
 * Get recent messages from a channel (for displaying sent history).
 */
export async function getChannelHistory(
  channel: string,
  limit = 20,
): Promise<SlackMessage[]> {
  const data = await slackApi<SlackApiResponse>('conversations.history', {
    channel,
    limit,
  });
  return data.messages ?? [];
}

/**
 * Check whether the bot token is configured and valid.
 * Returns true if the Slack API responds successfully to auth.test.
 */
export async function testConnection(): Promise<{
  connected: boolean;
  team?: string;
  botUser?: string;
  error?: string;
}> {
  try {
    const token = process.env.SLACK_BOT_TOKEN;
    if (!token) {
      return { connected: false, error: 'SLACK_BOT_TOKEN not configured' };
    }

    const res = await fetch('https://slack.com/api/auth.test', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json; charset=utf-8',
      },
    });

    const data = (await res.json()) as {
      ok: boolean;
      team?: string;
      user?: string;
      error?: string;
    };

    if (!data.ok) {
      return { connected: false, error: data.error };
    }

    return { connected: true, team: data.team, botUser: data.user };
  } catch (err) {
    return { connected: false, error: (err as Error).message };
  }
}
