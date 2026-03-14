'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import type { InterviewStage } from '@/types';

type Message = {
  role: 'user' | 'assistant';
  content: string;
  stage?: InterviewStage;
};

type StageInfo = {
  stage: InterviewStage;
  label: string;
};

type Props = {
  orgId: string;
  initialMessages?: Message[];
  initialStage?: InterviewStage;
  initialStageIndex?: number;
  interviewId?: string;
  onComplete?: () => void;
};

const STAGE_LABELS: StageInfo[] = [
  { stage: 'business_model_confirmation', label: 'Business Model' },
  { stage: 'goals_and_priorities', label: 'Goals' },
  { stage: 'contextual_enrichment', label: 'Context' },
  { stage: 'benchmarking_baseline', label: 'KPIs' },
];

const QUICK_REPLIES: Record<InterviewStage, string[]> = {
  business_model_confirmation: [
    'We sell subscriptions (SaaS)',
    'We do project-based work',
    'We sell physical products',
    'It is a mix of revenue models',
  ],
  goals_and_priorities: [
    'We want to grow revenue by 50%',
    'We need to improve cash flow',
    'We are hiring aggressively',
    'We want to expand to new markets',
  ],
  contextual_enrichment: [
    'Small team, less than 10 people',
    'Our top client is about 30% of revenue',
    'We are in a competitive niche market',
    'We prefer to be conservative',
  ],
  benchmarking_baseline: [
    'We are targeting 20% growth',
    'We want at least 60% gross margin',
    'We are comfortable with some cash burn',
    'We do not have specific targets yet',
  ],
};

export function InterviewChat({
  orgId,
  initialMessages = [],
  initialStage = 'business_model_confirmation',
  initialStageIndex = 0,
  interviewId: initialInterviewId,
  onComplete,
}: Props) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentStage, setCurrentStage] = useState<InterviewStage>(initialStage);
  const [stageIndex, setStageIndex] = useState(initialStageIndex);
  const [interviewId, setInterviewId] = useState<string | undefined>(initialInterviewId);
  const [isComplete, setIsComplete] = useState(false);
  const [initialized, setInitialized] = useState(initialMessages.length > 0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Start the interview on mount if no initial messages
  const startInterview = useCallback(async () => {
    if (initialized) return;
    setInitialized(true);
    setLoading(true);

    try {
      const res = await fetch(`/api/interview/${orgId}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start' }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessages([{
          role: 'assistant',
          content: data.error || 'Failed to start the interview. Please try again.',
        }]);
        return;
      }

      // If resuming with existing messages
      if (data.messages) {
        setMessages(data.messages);
        setCurrentStage(data.currentStage);
        setStageIndex(data.stageIndex);
        setInterviewId(data.interviewId);
        setIsComplete(data.isComplete ?? false);
      } else {
        // New interview — got the opening AI message
        setMessages([{
          role: 'assistant',
          content: data.aiResponse,
          stage: data.currentStage,
        }]);
        setCurrentStage(data.currentStage);
        setStageIndex(data.stageIndex);
        setInterviewId(data.interviewId);
      }
    } catch {
      setMessages([{
        role: 'assistant',
        content: 'Failed to connect. Please refresh and try again.',
      }]);
    } finally {
      setLoading(false);
    }
  }, [orgId, initialized]);

  useEffect(() => {
    startInterview();
  }, [startInterview]);

  // Send a user message
  async function handleSend(text?: string) {
    const messageText = (text ?? input).trim();
    if (!messageText || loading || isComplete) return;

    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: messageText, stage: currentStage }]);
    setLoading(true);

    try {
      const res = await fetch(`/api/interview/${orgId}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageText,
          currentStage,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: data.error || 'Something went wrong. Please try again.' },
        ]);
        return;
      }

      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.aiResponse, stage: data.currentStage },
      ]);

      setCurrentStage(data.currentStage);
      setStageIndex(data.stageIndex);

      if (data.interviewId) {
        setInterviewId(data.interviewId);
      }

      if (data.isComplete) {
        setIsComplete(true);
        onComplete?.();
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Network error. Please try again.' },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  // Skip the current stage
  async function handleSkip() {
    if (loading || isComplete) return;
    setLoading(true);

    try {
      const res = await fetch(`/api/interview/${orgId}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'skip',
          currentStage,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: data.error || 'Failed to skip.' },
        ]);
        return;
      }

      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.aiResponse, stage: data.currentStage },
      ]);

      setCurrentStage(data.currentStage);
      setStageIndex(data.stageIndex);

      if (data.isComplete) {
        setIsComplete(true);
        onComplete?.();
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Network error. Please try again.' },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-full max-h-[calc(100vh-12rem)]">
      {/* Stage Progress Indicator */}
      <div className="border-b px-6 py-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-foreground">Onboarding Interview</h2>
          {!isComplete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSkip}
              disabled={loading}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Skip this section
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {STAGE_LABELS.map((s, i) => (
            <div key={s.stage} className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <div
                  className={`h-2.5 w-2.5 rounded-full transition-colors ${
                    i < stageIndex
                      ? 'bg-primary'
                      : i === stageIndex && !isComplete
                      ? 'bg-primary animate-pulse'
                      : isComplete
                      ? 'bg-primary'
                      : 'bg-muted-foreground/25'
                  }`}
                />
                <span
                  className={`text-xs transition-colors ${
                    i <= stageIndex || isComplete
                      ? 'text-foreground font-medium'
                      : 'text-muted-foreground'
                  }`}
                >
                  {s.label}
                </span>
              </div>
              {i < STAGE_LABELS.length - 1 && (
                <div
                  className={`h-px w-8 transition-colors ${
                    i < stageIndex || isComplete ? 'bg-primary' : 'bg-muted-foreground/25'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground rounded-br-md'
                  : 'bg-muted text-foreground rounded-bl-md'
              }`}
            >
              {msg.role === 'assistant' && (
                <div className="flex items-center gap-1.5 mb-1">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                  <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                    Advisor
                  </span>
                </div>
              )}
              <div className="whitespace-pre-wrap">{msg.content}</div>
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex items-center gap-1.5 mb-1">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                  Advisor
                </span>
              </div>
              <div className="flex items-center gap-1">
                <div className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:0ms]" />
                <div className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:150ms]" />
                <div className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}

        {/* Completion message */}
        {isComplete && (
          <div className="flex justify-center py-4">
            <Badge variant="default" className="text-sm px-4 py-1.5">
              Interview Complete
            </Badge>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Reply Suggestions */}
      {!isComplete && !loading && messages.length > 0 && (
        <div className="px-6 py-2 border-t">
          <div className="flex flex-wrap gap-2">
            {QUICK_REPLIES[currentStage]?.map((reply, i) => (
              <button
                key={i}
                onClick={() => handleSend(reply)}
                className="text-xs px-3 py-1.5 rounded-full border border-border bg-background hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              >
                {reply}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      {!isComplete && (
        <div className="border-t px-6 py-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex gap-2 items-center"
          >
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your response..."
              disabled={loading}
              className="flex-1"
              autoFocus
            />
            {/* Voice mode placeholder */}
            <Button
              type="button"
              variant="outline"
              size="icon"
              disabled
              title="Voice mode coming soon"
              className="shrink-0 opacity-50"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" x2="12" y1="19" y2="22" />
              </svg>
            </Button>
            <Button
              type="submit"
              disabled={loading || !input.trim()}
              className="shrink-0"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m22 2-7 20-4-9-9-4Z" />
                <path d="M22 2 11 13" />
              </svg>
              <span className="sr-only">Send</span>
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
