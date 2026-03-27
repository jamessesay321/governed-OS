'use client';

import { useState, useCallback, useRef } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  isSpeechSupported,
  startListening,
  stopListening,
  type SpeechRecognitionStatus,
} from '@/lib/voice/speech-recognition';

interface VoiceInputProps {
  /** Called when final or interim transcript is available */
  onTranscript: (text: string) => void;
  /** Replace existing text (true) or append (false, default) */
  replaceMode?: boolean;
  /** Button size variant */
  size?: 'sm' | 'default' | 'lg' | 'icon';
  /** Additional CSS classes */
  className?: string;
  /** Accessible label */
  label?: string;
  /** Show text label alongside icon on larger screens */
  showLabel?: boolean;
}

export function VoiceInput({
  onTranscript,
  replaceMode = false,
  size = 'icon',
  className = '',
  label = 'Voice input',
  showLabel = false,
}: VoiceInputProps) {
  const [status, setStatus] = useState<SpeechRecognitionStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const stopRef = useRef<(() => void) | null>(null);
  const supported = typeof window !== 'undefined' ? isSpeechSupported() : true;

  const handleToggle = useCallback(() => {
    if (status === 'listening') {
      stopListening();
      stopRef.current = null;
      setStatus('idle');
      return;
    }

    setError(null);

    const stop = startListening(
      {
        onTranscript: (text, isFinal) => {
          if (isFinal || replaceMode) {
            onTranscript(text);
          }
        },
        onStatusChange: (s) => setStatus(s),
        onError: (e) => {
          setError(e);
          setTimeout(() => setError(null), 4000);
        },
      },
      { continuous: false }
    );

    stopRef.current = stop;
  }, [status, onTranscript, replaceMode]);

  if (!supported) return null;

  const isListening = status === 'listening';
  const isProcessing = status === 'processing';

  return (
    <div className={`relative inline-flex items-center ${className}`}>
      <Button
        type="button"
        variant={isListening ? 'default' : 'outline'}
        size={size}
        onClick={handleToggle}
        disabled={isProcessing}
        aria-label={label}
        title={isListening ? 'Stop listening' : label}
        className={`
          transition-all duration-200
          ${isListening ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse' : ''}
          ${size === 'icon' ? 'h-9 w-9 p-0' : ''}
        `}
      >
        {isProcessing ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isListening ? (
          <MicOff className="h-4 w-4" />
        ) : (
          <Mic className="h-4 w-4" />
        )}
        {showLabel && (
          <span className="ml-1.5 hidden sm:inline text-xs">
            {isListening ? 'Stop' : 'Speak'}
          </span>
        )}
      </Button>

      {/* Listening indicator ring */}
      {isListening && (
        <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" />
        </span>
      )}

      {/* Error tooltip */}
      {error && (
        <div className="absolute top-full left-1/2 z-50 mt-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-destructive px-3 py-1.5 text-xs text-destructive-foreground shadow-lg">
          {error}
        </div>
      )}
    </div>
  );
}
