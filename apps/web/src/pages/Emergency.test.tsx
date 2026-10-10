import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen, within } from '@testing-library/react';
import { loginAsDemo } from '../test-utils';

async function openSos() {
  const user = await loginAsDemo();
  await user.click(screen.getByRole('link', { name: /Emergency SOS/i }));
  await screen.findByRole('heading', { level: 1, name: "What's happening?" });
  return user;
}

describe('Emergency', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('offers four choices, a way back, and says no real call is made', async () => {
    await openSos();
    for (const name of ["Can't breathe", 'Chest pain', 'Fainted or very dizzy', 'Other emergency']) {
      expect(screen.getByRole('link', { name })).toBeTruthy();
    }
    expect(screen.getByRole('link', { name: 'Back — I pressed this by mistake' })).toBeTruthy();
    expect(screen.getByText('Demo: no real call is made. In a real emergency, call 995 yourself.')).toBeTruthy();
  });

  it('turns the whole screen red, status bar included, and puts it back when leaving', async () => {
    const user = await openSos();
    const theme = () => document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.content;
    expect(theme()).toBe('#B83A26');
    expect(document.body.style.background).toBe('rgb(184, 58, 38)');

    await user.click(screen.getByRole('link', { name: 'Back — I pressed this by mistake' }));
    await screen.findByRole('heading', { level: 1, name: /, Mdm Tan$/ });
    expect(theme()).toBe('#F5F3EE');
    expect(document.body.style.background).toBe('');
  });

  it('counts down from 10 and can be cancelled', async () => {
    const user = await openSos();

    await user.click(screen.getByRole('link', { name: "Can't breathe" }));

    expect(screen.getByRole('timer', { name: 'Calling 995 in 10 seconds. Press Cancel to stop.' })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: /Cancel/ }));
    expect(screen.getByRole('status')).toHaveProperty('textContent', 'Call cancelled');
    expect(screen.getByRole('link', { name: "I'm OK — go home" })).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'I need help — call 995' }));
    expect(screen.getByRole('timer', { name: /Calling 995 in 10 seconds/ })).toBeTruthy();
  });

  it('opens the simulated call when the countdown ends', async () => {
    await openSos();

    vi.useFakeTimers();
    fireEvent.click(screen.getByRole('link', { name: 'Chest pain' }));
    for (let i = 0; i <= 10; i += 1) {
      await act(async () => {
        vi.advanceTimersByTime(1000);
      });
    }
    vi.useRealTimers();

    expect(await screen.findByRole('heading', { level: 1, name: 'Calling 995' })).toBeTruthy();
  });

  it('calls now, messages the family, and asks before cancelling', async () => {
    const user = await openSos();
    await user.click(screen.getByRole('link', { name: "Can't breathe" }));
    await user.click(screen.getByRole('link', { name: "Call now — don't wait" }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Calling 995' })).toBeTruthy();
    expect(screen.getByRole('note')).toHaveProperty('textContent', 'Demo: no real call is made. In a real emergency, call 995 yourself.');
    expect(await screen.findByText("We've also sent a message to Mei Ling.")).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Cancel call' }));
    const dialog = screen.getByRole('dialog', { name: 'Cancel the emergency call?' });
    await user.click(within(dialog).getByRole('button', { name: 'No, keep calling' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
