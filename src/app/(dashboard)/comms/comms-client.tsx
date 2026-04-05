'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SlackChannel = {
  id: string;
  name: string;
  is_private: boolean;
  is_member: boolean;
  num_members: number;
  topic: string;
  purpose: string;
};

type ConnectionStatus = {
  connected: boolean;
  team: string | null;
  botUser: string | null;
  error: string | null;
  channels: SlackChannel[];
};

type AlertRule = {
  id: string;
  type: 'critical' | 'warning' | 'info';
  label: string;
  channel: string;
  enabled: boolean;
};

type SentMessage = {
  id: string;
  channel: string;
  channelName: string;
  type: 'test' | 'briefing' | 'alert';
  sentAt: string;
  preview: string;
};

type Props = {
  orgId: string;
  orgName: string;
  slackConfigured: boolean;
};

// ---------------------------------------------------------------------------
// Default alert rules (stored client-side for now, later persisted)
// ---------------------------------------------------------------------------

const DEFAULT_ALERT_RULES: AlertRule[] = [
  { id: 'cash-critical', type: 'critical', label: 'Cash runway below 30 days', channel: '', enabled: true },
  { id: 'revenue-drop', type: 'warning', label: 'Revenue drop > 20% vs prior month', channel: '', enabled: true },
  { id: 'kpi-breach', type: 'warning', label: 'KPI threshold breach', channel: '', enabled: true },
  { id: 'sync-failure', type: 'critical', label: 'Accounting sync failure', channel: '', enabled: true },
  { id: 'budget-variance', type: 'info', label: 'Budget variance > 15%', channel: '', enabled: false },
  { id: 'new-anomaly', type: 'info', label: 'New anomaly detected', channel: '', enabled: false },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CommsClient({ orgId, orgName, slackConfigured }: Props) {
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [sendingTest, setSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [briefingChannel, setBriefingChannel] = useState('');
  const [sendingBriefing, setSendingBriefing] = useState(false);
  const [briefingResult, setBriefingResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [testChannel, setTestChannel] = useState('');
  const [alertRules, setAlertRules] = useState<AlertRule[]>(DEFAULT_ALERT_RULES);
  const [sentMessages, setSentMessages] = useState<SentMessage[]>([]);

  // Fetch connection status
  const fetchStatus = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/integrations/slack');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = (await res.json()) as ConnectionStatus;
      setStatus(data);
    } catch {
      setStatus({ connected: false, team: null, botUser: null, error: 'Unable to reach Slack API', channels: [] });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (slackConfigured) {
      fetchStatus();
    } else {
      setLoading(false);
    }
  }, [slackConfigured, fetchStatus]);

  // Send test message
  async function handleSendTest() {
    if (!testChannel) return;
    setSendingTest(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/integrations/slack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel: testChannel }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed');
      setTestResult({ ok: true, message: 'Test message sent successfully' });
      const channelObj = status?.channels.find((c) => c.id === testChannel);
      setSentMessages((prev) => [
        {
          id: data.ts ?? Date.now().toString(),
          channel: testChannel,
          channelName: channelObj?.name ?? testChannel,
          type: 'test',
          sentAt: new Date().toISOString(),
          preview: 'Test message from Grove',
        },
        ...prev,
      ]);
    } catch (err) {
      setTestResult({ ok: false, message: (err as Error).message });
    } finally {
      setSendingTest(false);
    }
  }

  // Send daily briefing
  async function handleSendBriefing() {
    if (!briefingChannel) return;
    setSendingBriefing(true);
    setBriefingResult(null);
    try {
      const res = await fetch('/api/integrations/slack/briefing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel: briefingChannel }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed');
      setBriefingResult({ ok: true, message: 'Daily briefing sent successfully' });
      const channelObj = status?.channels.find((c) => c.id === briefingChannel);
      setSentMessages((prev) => [
        {
          id: data.ts ?? Date.now().toString(),
          channel: briefingChannel,
          channelName: channelObj?.name ?? briefingChannel,
          type: 'briefing',
          sentAt: new Date().toISOString(),
          preview: `Daily briefing for ${orgName}`,
        },
        ...prev,
      ]);
    } catch (err) {
      setBriefingResult({ ok: false, message: (err as Error).message });
    } finally {
      setSendingBriefing(false);
    }
  }

  // Toggle alert rule
  function toggleAlertRule(ruleId: string) {
    setAlertRules((prev) =>
      prev.map((r) => (r.id === ruleId ? { ...r, enabled: !r.enabled } : r)),
    );
  }

  // Set channel for an alert rule
  function setAlertRuleChannel(ruleId: string, channel: string) {
    setAlertRules((prev) =>
      prev.map((r) => (r.id === ruleId ? { ...r, channel } : r)),
    );
  }

  const channels = status?.channels ?? [];

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Team Comms</h1>
        <p className="text-muted-foreground">
          Connect Slack to send financial briefings, KPI alerts, and governance notifications to your team.
        </p>
      </div>

      {/* Not configured state */}
      {!slackConfigured && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SlackIcon />
              Connect Slack
            </CardTitle>
            <CardDescription>
              Slack integration is not yet configured. Add your Slack Bot Token and
              Signing Secret to get started.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-dashed border-amber-300 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-200">
              <p className="font-medium">Setup instructions:</p>
              <ol className="mt-2 list-inside list-decimal space-y-1">
                <li>
                  Go to{' '}
                  <a
                    href="https://api.slack.com/apps"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    api.slack.com/apps
                  </a>{' '}
                  and create a new Slack App.
                </li>
                <li>Enable Bot Token Scopes: <code className="rounded bg-amber-100 px-1 dark:bg-amber-900">chat:write</code>, <code className="rounded bg-amber-100 px-1 dark:bg-amber-900">channels:read</code>, <code className="rounded bg-amber-100 px-1 dark:bg-amber-900">channels:history</code>, <code className="rounded bg-amber-100 px-1 dark:bg-amber-900">groups:read</code>.</li>
                <li>Install the app to your workspace.</li>
                <li>
                  Copy the <strong>Bot User OAuth Token</strong> and <strong>Signing Secret</strong> into your{' '}
                  <code className="rounded bg-amber-100 px-1 dark:bg-amber-900">.env.local</code> file.
                </li>
              </ol>
            </div>
            <pre className="overflow-x-auto rounded-lg bg-zinc-100 p-3 text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
{`SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_SIGNING_SECRET=your-signing-secret`}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* Loading state */}
      {slackConfigured && loading && (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="flex items-center gap-3 text-muted-foreground">
              <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Connecting to Slack...
            </div>
          </CardContent>
        </Card>
      )}

      {/* Connected / Error states */}
      {slackConfigured && !loading && status && (
        <>
          {/* Connection status card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <SlackIcon />
                  <div>
                    <CardTitle className="text-lg">Slack Connection</CardTitle>
                    <CardDescription>
                      {status.connected
                        ? `Connected to ${status.team ?? 'workspace'}`
                        : 'Not connected'}
                    </CardDescription>
                  </div>
                </div>
                <Badge variant={status.connected ? 'default' : 'destructive'}>
                  {status.connected ? 'Connected' : 'Disconnected'}
                </Badge>
              </div>
            </CardHeader>
            {status.connected && (
              <CardContent>
                <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-3">
                  <div>
                    <p className="text-muted-foreground">Workspace</p>
                    <p className="font-medium">{status.team}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Bot User</p>
                    <p className="font-medium">@{status.botUser}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Channels Available</p>
                    <p className="font-medium">{channels.length}</p>
                  </div>
                </div>
              </CardContent>
            )}
            {!status.connected && status.error && (
              <CardContent>
                <p className="text-sm text-red-600 dark:text-red-400">
                  Error: {status.error}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={fetchStatus}
                >
                  Retry
                </Button>
              </CardContent>
            )}
          </Card>

          {status.connected && (
            <>
              {/* Daily briefing card */}
              <Card>
                <CardHeader>
                  <CardTitle>Daily Financial Briefing</CardTitle>
                  <CardDescription>
                    Send a daily summary of KPIs, cash position, and alerts to a Slack channel.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                    <div className="flex-1 space-y-1.5">
                      <label className="text-sm font-medium">Briefing Channel</label>
                      <Select value={briefingChannel} onValueChange={setBriefingChannel}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a channel..." />
                        </SelectTrigger>
                        <SelectContent>
                          {channels.map((ch) => (
                            <SelectItem key={ch.id} value={ch.id}>
                              {ch.is_private ? '🔒' : '#'} {ch.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      onClick={handleSendBriefing}
                      disabled={!briefingChannel || sendingBriefing}
                    >
                      {sendingBriefing ? 'Sending...' : 'Send Briefing Now'}
                    </Button>
                  </div>
                  {briefingResult && (
                    <p
                      className={`text-sm ${briefingResult.ok ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}
                    >
                      {briefingResult.message}
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Alert notification settings */}
              <Card>
                <CardHeader>
                  <CardTitle>Alert Notifications</CardTitle>
                  <CardDescription>
                    Route Grove alerts to specific Slack channels. Critical alerts are
                    always recommended.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {alertRules.map((rule) => (
                      <div
                        key={rule.id}
                        className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => toggleAlertRule(rule.id)}
                            className={`relative h-5 w-9 rounded-full transition-colors ${
                              rule.enabled
                                ? 'bg-green-500'
                                : 'bg-zinc-300 dark:bg-zinc-600'
                            }`}
                          >
                            <span
                              className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
                                rule.enabled ? 'translate-x-4' : 'translate-x-0'
                              }`}
                            />
                          </button>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">{rule.label}</span>
                              <SeverityBadge severity={rule.type} />
                            </div>
                          </div>
                        </div>
                        <div className="w-full sm:w-48">
                          <Select
                            value={rule.channel}
                            onValueChange={(val) => setAlertRuleChannel(rule.id, val)}
                            disabled={!rule.enabled}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Select channel" />
                            </SelectTrigger>
                            <SelectContent>
                              {channels.map((ch) => (
                                <SelectItem key={ch.id} value={ch.id}>
                                  {ch.is_private ? '🔒' : '#'} {ch.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Test message */}
              <Card>
                <CardHeader>
                  <CardTitle>Send Test Message</CardTitle>
                  <CardDescription>
                    Verify the integration by sending a test message to any channel.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                    <div className="flex-1 space-y-1.5">
                      <label className="text-sm font-medium">Channel</label>
                      <Select value={testChannel} onValueChange={setTestChannel}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a channel..." />
                        </SelectTrigger>
                        <SelectContent>
                          {channels.map((ch) => (
                            <SelectItem key={ch.id} value={ch.id}>
                              {ch.is_private ? '🔒' : '#'} {ch.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      variant="outline"
                      onClick={handleSendTest}
                      disabled={!testChannel || sendingTest}
                    >
                      {sendingTest ? 'Sending...' : 'Send Test'}
                    </Button>
                  </div>
                  {testResult && (
                    <p
                      className={`text-sm ${testResult.ok ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}
                    >
                      {testResult.message}
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Recent messages sent by Grove */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Messages</CardTitle>
                  <CardDescription>
                    Messages sent by Grove to Slack in this session.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {sentMessages.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">
                      No messages sent yet. Use the controls above to send a briefing or test message.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {sentMessages.map((msg) => (
                        <div
                          key={msg.id}
                          className="flex items-center justify-between rounded-lg border px-4 py-2.5"
                        >
                          <div className="flex items-center gap-3">
                            <MessageTypeBadge type={msg.type} />
                            <div>
                              <p className="text-sm font-medium">{msg.preview}</p>
                              <p className="text-xs text-muted-foreground">
                                #{msg.channelName}
                              </p>
                            </div>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {new Date(msg.sentAt).toLocaleTimeString('en-GB', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SlackIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 128 128" className="shrink-0">
      <path
        d="M27.2 80c0 7.3-5.9 13.2-13.2 13.2S.8 87.3.8 80s5.9-13.2 13.2-13.2h13.2V80zm6.6 0c0-7.3 5.9-13.2 13.2-13.2s13.2 5.9 13.2 13.2v33c0 7.3-5.9 13.2-13.2 13.2S33.8 120.3 33.8 113V80z"
        fill="#e01e5a"
      />
      <path
        d="M47 27.2c-7.3 0-13.2-5.9-13.2-13.2S39.7.8 47 .8s13.2 5.9 13.2 13.2v13.2H47zm0 6.6c7.3 0 13.2 5.9 13.2 13.2s-5.9 13.2-13.2 13.2H14c-7.3 0-13.2-5.9-13.2-13.2S6.7 33.8 14 33.8h33z"
        fill="#36c5f0"
      />
      <path
        d="M100 47c0-7.3 5.9-13.2 13.2-13.2s13.2 5.9 13.2 13.2-5.9 13.2-13.2 13.2H100V47zm-6.6 0c0 7.3-5.9 13.2-13.2 13.2S67 54.3 67 47V14c0-7.3 5.9-13.2 13.2-13.2S93.4 6.7 93.4 14v33z"
        fill="#2eb67d"
      />
      <path
        d="M80.2 100c7.3 0 13.2 5.9 13.2 13.2s-5.9 13.2-13.2 13.2S67 120.5 67 113.2V100h13.2zm0-6.6c-7.3 0-13.2-5.9-13.2-13.2s5.9-13.2 13.2-13.2h33c7.3 0 13.2 5.9 13.2 13.2S120.5 93.4 113.2 93.4h-33z"
        fill="#ecb22e"
      />
    </svg>
  );
}

function SeverityBadge({ severity }: { severity: 'critical' | 'warning' | 'info' }) {
  const variant =
    severity === 'critical'
      ? 'destructive'
      : severity === 'warning'
        ? 'secondary'
        : 'outline';

  return (
    <Badge variant={variant as 'default' | 'destructive' | 'secondary' | 'outline'} className="text-[10px] uppercase">
      {severity}
    </Badge>
  );
}

function MessageTypeBadge({ type }: { type: 'test' | 'briefing' | 'alert' }) {
  const colours: Record<string, string> = {
    test: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
    briefing: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    alert: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  };

  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${colours[type]}`}
    >
      {type}
    </span>
  );
}
