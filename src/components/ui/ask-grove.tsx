'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Sparkles, Send, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { VoiceInput } from '@/components/ui/voice-input';

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

interface Source {
  source: string;
  reference: string;
}

interface GroveResponse {
  answer: string;
  sources: Source[];
}

/* ------------------------------------------------------------------ */
/*  Suggested questions                                                 */
/* ------------------------------------------------------------------ */

const SUGGESTED_QUESTIONS = [
  "How's my cash flow?",
  'What should I focus on this month?',
  'Compare this month to last month',
  'Are there any anomalies in my financials?',
];

/* ------------------------------------------------------------------ */
/*  Source badge colour                                                  */
/* ------------------------------------------------------------------ */

function sourceBadgeClass(source: string): string {
  const s = source.toLowerCase();
  if (s.includes('xero')) return 'bg-blue-100 text-blue-700 border-blue-200';
  if (s.includes('calculated') || s.includes('derived'))
    return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  if (s.includes('health')) return 'bg-amber-100 text-amber-700 border-amber-200';
  return 'bg-gray-100 text-gray-700 border-gray-200';
}

/* ------------------------------------------------------------------ */
/*  Typing animation dots                                               */
/* ------------------------------------------------------------------ */

function TypingDots() {
  return (
    <div className="flex items-center gap-1 py-4">
      <div className="h-2 w-2 rounded-full bg-emerald-400 animate-bounce [animation-delay:0ms]" />
      <div className="h-2 w-2 rounded-full bg-emerald-400 animate-bounce [animation-delay:150ms]" />
      <div className="h-2 w-2 rounded-full bg-emerald-400 animate-bounce [animation-delay:300ms]" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                      */
/* ------------------------------------------------------------------ */

export function AskGrove() {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<GroveResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Focus input when dialog opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const handleAsk = useCallback(
    async (q?: string) => {
      const text = (q ?? question).trim();
      if (!text || loading) return;

      setLoading(true);
      setError(null);
      setResponse(null);

      try {
        const res = await fetch('/api/ask-grove', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question: text }),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? `Request failed (${res.status})`);
        }

        const data: GroveResponse = await res.json();
        setResponse(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong');
      } finally {
        setLoading(false);
      }
    },
    [question, loading],
  );

  const handleSuggestion = (q: string) => {
    setQuestion(q);
    handleAsk(q);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAsk();
    }
  };

  const handleClose = () => {
    setOpen(false);
    // Reset after animation
    setTimeout(() => {
      setQuestion('');
      setResponse(null);
      setError(null);
    }, 200);
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-5 z-40 flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg transition-all hover:bg-emerald-700 hover:shadow-xl active:scale-95 md:bottom-6"
        aria-label="Ask Grove"
      >
        <Sparkles className="h-4 w-4" />
        <span className="hidden sm:inline">Ask Grove</span>
      </button>

      {/* Dialog */}
      <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : handleClose())}>
        <DialogContent
          className="sm:max-w-2xl max-h-[90vh] flex flex-col gap-0 p-0 overflow-hidden"
          showCloseButton={false}
        >
          {/* Header */}
          <DialogHeader className="flex flex-row items-center justify-between border-b px-5 py-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100">
                <Sparkles className="h-4 w-4 text-emerald-600" />
              </div>
              <DialogTitle className="text-base font-semibold">Ask Grove</DialogTitle>
            </div>
            <button
              onClick={handleClose}
              className="rounded-md p-1 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </DialogHeader>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 min-h-0">
            {/* Suggestions (show when no response yet) */}
            {!response && !loading && !error && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                  Try asking:
                </p>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTED_QUESTIONS.map((sq) => (
                    <button
                      key={sq}
                      onClick={() => handleSuggestion(sq)}
                      className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs text-emerald-700 transition-colors hover:bg-emerald-100"
                    >
                      {sq}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Loading */}
            {loading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Sparkles className="h-4 w-4 text-emerald-500" />
                <span>Grove is thinking...</span>
                <TypingDots />
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Response */}
            {response && (
              <div className="space-y-3">
                <div className="prose prose-sm max-w-none text-foreground leading-relaxed whitespace-pre-wrap">
                  {response.answer}
                </div>

                {/* Source citations */}
                {response.sources.length > 0 && (
                  <div className="space-y-1.5 pt-2 border-t">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                      Sources
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {response.sources.map((src, i) => (
                        <Badge
                          key={i}
                          variant="outline"
                          className={`text-[10px] ${sourceBadgeClass(src.source)}`}
                        >
                          <span className="font-semibold mr-1">{i + 1}</span>
                          {src.source}: {src.reference}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Input area */}
          <div className="border-t px-5 py-3">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything about your business..."
                rows={1}
                className="flex-1 resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:opacity-50 max-h-24 overflow-y-auto"
                disabled={loading}
              />
              <VoiceInput
                onTranscript={(text) => setQuestion((prev) => (prev ? prev + ' ' + text : text))}
                size="icon"
                label="Voice input"
              />
              <Button
                size="icon"
                onClick={() => handleAsk()}
                disabled={loading || !question.trim()}
                className="bg-emerald-600 hover:bg-emerald-700 shrink-0"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
