// Per-phone preferences (Text size and sound page). Stored on this device only; storage can
// be unavailable (private mode), so every read and write is guarded and falls back to the default.
const MIC_KEY = 'ventra.mic';

// "Talk instead of type": the mic buttons on Ask AI and How I feel. On unless turned off.
export function micEnabled(): boolean {
  try {
    return localStorage.getItem(MIC_KEY) !== 'off';
  } catch {
    return true;
  }
}

export function setMicEnabled(on: boolean): void {
  try {
    localStorage.setItem(MIC_KEY, on ? 'on' : 'off');
  } catch {
    // Not saved; the switch still works until the page is closed.
  }
}
