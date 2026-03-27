/**
 * Voice Recognition Utility
 * Wraps the Web Speech API for consistent use across Grove.
 * Provides start/stop/transcript callbacks with graceful fallback.
 */

export type SpeechRecognitionStatus = 'idle' | 'listening' | 'processing' | 'error' | 'unsupported';

export interface SpeechRecognitionCallbacks {
  onTranscript: (text: string, isFinal: boolean) => void;
  onStatusChange?: (status: SpeechRecognitionStatus) => void;
  onError?: (error: string) => void;
}

// Web Speech API types (not in all TS libs)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SpeechRecognitionInstance = any;

interface SpeechRecognitionWindow extends Window {
  SpeechRecognition?: new () => SpeechRecognitionInstance;
  webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
}

let recognitionInstance: SpeechRecognitionInstance | null = null;

/**
 * Check if the browser supports the Web Speech API.
 */
export function isSpeechSupported(): boolean {
  if (typeof window === 'undefined') return false;
  const win = window as unknown as SpeechRecognitionWindow;
  return !!(win.SpeechRecognition || win.webkitSpeechRecognition);
}

/**
 * Start listening for voice input.
 * Returns a stop function, or null if unsupported.
 */
export function startListening(
  callbacks: SpeechRecognitionCallbacks,
  options?: { language?: string; continuous?: boolean }
): (() => void) | null {
  if (!isSpeechSupported()) {
    callbacks.onStatusChange?.('unsupported');
    callbacks.onError?.('Voice input is not supported in this browser. Try Chrome or Edge.');
    return null;
  }

  // Stop any existing session
  if (recognitionInstance) {
    try { recognitionInstance.stop(); } catch { /* ignore */ }
  }

  const win = window as unknown as SpeechRecognitionWindow;
  const SpeechRecognitionAPI = win.SpeechRecognition || win.webkitSpeechRecognition;
  if (!SpeechRecognitionAPI) return null;

  const recognition = new SpeechRecognitionAPI();
  recognitionInstance = recognition;

  recognition.lang = options?.language || 'en-GB';
  recognition.continuous = options?.continuous ?? false;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;

  recognition.onstart = () => {
    callbacks.onStatusChange?.('listening');
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  recognition.onresult = (event: any) => {
    let finalTranscript = '';
    let interimTranscript = '';

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      if (result.isFinal) {
        finalTranscript += result[0].transcript;
      } else {
        interimTranscript += result[0].transcript;
      }
    }

    if (finalTranscript) {
      callbacks.onTranscript(finalTranscript, true);
    } else if (interimTranscript) {
      callbacks.onTranscript(interimTranscript, false);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  recognition.onerror = (event: any) => {
    const errorMessages: Record<string, string> = {
      'no-speech': 'No speech detected. Please try again.',
      'audio-capture': 'Microphone not found. Check your device settings.',
      'not-allowed': 'Microphone access denied. Please allow microphone permissions.',
      'network': 'Network error. Check your connection and try again.',
      'aborted': 'Voice input was cancelled.',
    };
    const message = errorMessages[event.error] || `Voice input error: ${event.error}`;
    callbacks.onStatusChange?.('error');
    callbacks.onError?.(message);
  };

  recognition.onend = () => {
    callbacks.onStatusChange?.('idle');
    recognitionInstance = null;
  };

  try {
    recognition.start();
  } catch {
    callbacks.onStatusChange?.('error');
    callbacks.onError?.('Could not start voice input. Please try again.');
    return null;
  }

  return () => {
    try {
      recognition.stop();
    } catch { /* ignore */ }
    recognitionInstance = null;
  };
}

/**
 * Stop any active listening session.
 */
export function stopListening(): void {
  if (recognitionInstance) {
    try { recognitionInstance.stop(); } catch { /* ignore */ }
    recognitionInstance = null;
  }
}
