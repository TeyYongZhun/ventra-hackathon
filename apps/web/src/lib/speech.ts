// Speech-to-text from the browser (Ask AI's mic, How I feel's "Tap and speak").
// Some browsers stop straight away; the reason comes back in onerror, and this turns it into
// words the patient can act on instead of "Listening…" just disappearing.
export type Recognition = {
  lang: string;
  interimResults: boolean;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  start: () => void;
  stop: () => void;
};

export function recognitionClass(): (new () => Recognition) | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

// Message for a recognition error code; null when there is nothing to tell (the patient stopped it).
export function speechErrorMessage(code: string | undefined): string | null {
  switch (code) {
    case 'aborted':
      return null;
    case 'no-speech':
      return "We didn't hear anything. Tap the microphone and speak.";
    case 'audio-capture':
      return 'No microphone was found on this device.';
    case 'not-allowed':
    case 'service-not-allowed':
      return typeof window !== 'undefined' && !window.isSecureContext
        ? 'Voice only works on a secure (https) page. Please type instead.'
        : 'The microphone is blocked. Allow microphone access for this site in your browser settings, then try again.';
    case 'network':
      return "This browser couldn't reach its voice service. Check your internet, or try Chrome or Safari. You can also type.";
    case 'language-not-supported':
      return "This browser can't listen in English (Singapore). Please type instead.";
    default:
      return "Voice didn't work on this browser. Please type instead.";
  }
}
