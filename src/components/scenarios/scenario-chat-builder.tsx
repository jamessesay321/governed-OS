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

type Props = {
  scenarioId: string;
  assumptionSetId: string;
  basePeriodStart: string;
  basePeriodEnd: string;
  forecastHorizonMonths: number;
  onChangesApplied?: () => void;
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
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: data.error || 'Something went wrong.' },
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
        { role: 'assistant', content: 'Network error — please try again.' },
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
        { role: 'assistant', content: 'Network error — confirmation failed.' },
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

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 p-3">
        {messages.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            Describe a what-if scenario in plain English. For example:
            <br />
            <em>&quot;What if revenue grows 10% monthly with a new hire at $8k/month?&quot;</em>
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
              Interpreting your request...
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t p-3">
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
            placeholder="Describe a what-if scenario..."
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
