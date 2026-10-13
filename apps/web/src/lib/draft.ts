import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';

// Answers typed into sign-up and set-up, kept while the browser tab is open, so going Back (or
// back and forward again) shows what the patient already typed. sessionStorage only: gone when
// the tab closes, and cleared when set-up finishes. Never used for a PIN.
const PREFIX = 'ventra.draft.';

// Like useState, but kept under `key` when one is given (no key: plain state).
export function useDraft<T>(key: string | undefined, initial: T): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    if (!key) return initial;
    try {
      const saved = sessionStorage.getItem(PREFIX + key);
      return saved ? (JSON.parse(saved) as T) : initial;
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    if (!key) return;
    try {
      sessionStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch {
      // Storage blocked: Back simply starts the step empty again.
    }
  }, [key, value]);

  return [value, setValue];
}

// Forget every draft whose key starts with `prefix` (e.g. 'setup.' once set-up is finished).
export function clearDrafts(prefix: string) {
  try {
    for (const key of Object.keys(sessionStorage)) {
      if (key.startsWith(PREFIX + prefix)) sessionStorage.removeItem(key);
    }
  } catch {
    // Nothing to clear.
  }
}
