import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import { loginAsDemo } from '../test-utils';
import { speechErrorMessage } from './speech';

describe('speechErrorMessage', () => {
  it('explains each way voice can stop', () => {
    expect(speechErrorMessage('aborted')).toBeNull();
    expect(speechErrorMessage('no-speech')).toMatch(/didn't hear anything/);
    expect(speechErrorMessage('audio-capture')).toMatch(/No microphone/);
    expect(speechErrorMessage('network')).toMatch(/voice service/);
    expect(speechErrorMessage('not-allowed')).toMatch(/microphone is blocked|secure \(https\)/);
    expect(speechErrorMessage('something-new')).toMatch(/Please type instead/);
  });
});

// A browser whose speech service refuses straight away, like the device in the bug report.
class RefusingRecognition {
  lang = '';
  interimResults = false;
  onresult: unknown = null;
  onend: (() => void) | null = null;
  onerror: ((event: { error: string }) => void) | null = null;
  start() {
    setTimeout(() => {
      this.onerror?.({ error: 'not-allowed' });
      this.onend?.();
    }, 0);
  }
  stop() {}
}

describe('Ask AI mic when the browser refuses', () => {
  beforeEach(() => {
    localStorage.clear();
    (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition = RefusingRecognition;
  });
  afterEach(() => {
    delete (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition;
  });

  it('says why instead of "Listening…" just disappearing', async () => {
    const user = await loginAsDemo();
    await user.click(within(screen.getByRole('navigation', { name: 'Main menu' })).getByRole('button', { name: 'Ask AI' }));
    await user.click(await screen.findByRole('button', { name: 'Speak instead' }));
    expect(await screen.findByText(/microphone is blocked|secure \(https\)/)).toBeTruthy();
    expect(screen.queryByText('Listening… speak now')).toBeNull();
  });
});
