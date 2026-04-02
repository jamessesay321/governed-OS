'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ProposalCard } from './proposal-card';
import type { LLMInterpretation } from '@/types';
import type { ValidationWarning } from '@/lib/ai/validate-proposal';

type Message = {
  role: 'user' | 'assistant';
  content: string;
  interpretation?: LLMInterpretation;
  confirmationToken?: string;
  changeLogId?: string;
  warnings?: ValidationWarning[];
};

type ScenarioMode = 'what_if' | 'goalseek';

type Props = {
  scenarioId: string;
  assumptionSetId: string;
  basePeriodStart: string;
  basePeriodEnd: string;
  forecastHorizonMonths: number;
  onChangesApplied?: () => void;
};

const MODE_CONFIG: Record<ScenarioMode, { label: string; placeholder: string; hint: string }> = {
  what_if: {
    label: 'What-if',
    placeholder: 'e.g. What if revenue grows 10% with a new hire at £8k/month?',
    hint: 'Describe a change and see the projected impact.',
  },
  goalseek: {
    label: 'Goalseek',
    placeholder: 'e.g. What revenue do I need to hit 20% net margin?',
    hint: 'Set a target and work backwards to find what needs to change.',
  },
};

export function ScenarioChatBuilder({
  scenarioId,
  basePeriodStart,
  basePeriodEnd,
  forecastHorizonMonths,
  onChangesApplied,
}: Props) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [mode, setMode] = useState<ScenarioMode>('what_if');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;

    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: text }]);
    setLoading(true);

    try {
      const res = await fetch(`/api/scenarios/${scenarioId}/interpret`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          naturalLanguageInput: text,
          basePeriodStart,
          basePeriodEnd,
          forecastHorizonMonths,
          mode,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        // Surface specific error messages for rate limits
        const errorMessage = res.status === 429
          ? 'You\'re sending requests too quickly. Please wait a moment before trying again.'
          : res.status === 402
          ? 'Monthly AI token budget exhausted. Please try again next month or upgrade your plan.'
          : data.error || 'Something went wrong.';

        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: errorMessage },
        ]);
        return;
      }

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: data.interpretation.interpretation_summary,
          interpretation: data.interpretation,
          confirmationToken: data.confirmationToken,
          changeLogId: data.changeLogId,
          warnings: data.warnings,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Network error. Please try again.' },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm(token: string) {
    setConfirming(true);
    try {
      const res = await fetch(`/api/scenarios/${scenarioId}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmationToken: token }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: `Changes applied successfully. Model recalculated (${data.snapshotCount} snapshots).`,
          },
        ]);
        onChangesApplied?.();
        router.refresh();
      } else {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: `Failed to confirm: ${data.error}` },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Network error. Confirmation failed.' },
      ]);
    } finally {
      setConfirming(false);
    }
  }

  async function handleReject(changeLogId: string) {
    try {
      await fetch(`/api/scenarios/${scenarioId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ changeLogId }),
      });

      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Proposal rejected.' },
      ]);
    } catch {
      // Best effort
    }
  }

  const modeConfig = MODE_CONFIG[mode];

  return (
    <div className="flex flex-col h-full">
      {/* Mode Toggle */}
      <div className="flex items-center gap-1 border-b px-3 py-2">
        {(Object.entries(MODE_CONFIG) as [ScenarioMode, typeof modeConfig][]).map(([key, cfg]) => (
          <button
            key={key}
            onClick={() => setMode(key)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              mode === key
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            {cfg.label}
          </button>
        ))}
        <span className="ml-auto text-[10px] text-muted-foreground">{modeConfig.hint}</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 p-3">
        {messages.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            {mode === 'what_if' ? (
              <>
                Describe a what-if scenario in plain English. For example:
                <br />
                <em>&quot;What if revenue grows 10% monthly with a new hire at £8k/month?&quot;</em>
              </>
            ) : (
              <>
                Set a target and I will work backwards. For example:
                <br />
                <em>&quot;What revenue do I need to achieve a 20% net margin?&quot;</em>
              </>
            )}
          </p>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted'
              }`}
            >
              {msg.interpretation ? (
                <ProposalCard
                  interpretation={msg.interpretation}
                  warnings={msg.warnings ?? []}
                  confirmationToken={msg.confirmationToken}
                  onConfirm={handleConfirm}
                  onReject={() => msg.changeLogId && handleReject(msg.changeLogId)}
                  confirming={confirming}
                />
              ) : (
                <p>{msg.content}</p>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-lg px-3 py-2 text-sm text-muted-foreground">
              {mode === 'goalseek' ? 'Working backwards from your target...' : 'Interpreting your request...'}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t p-3">
        <div className="flex items-center justify-end gap-1 mb-1.5 text-[10px] text-muted-foreground">
          <svg className="h-2.5 w-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
          </svg>
          <span>Powered by Claude</span>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={modeConfig.placeholder}
            className="flex-1 rounded border px-3 py-2 text-sm"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="rounded bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
