import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import { mdmTanSeed, type DoseStatus } from '@ventra/core';
import { dueReminder, reminderText, sgNow } from '../lib/reminders';
import { loginAsDemo } from '../test-utils';

const med = (id: string) => mdmTanSeed.meds.find((m) => m.id === id)!;
const dose = (id: string, time: number, taken = false): DoseStatus =>
  ({ med: med(id), time, index: 1, of: 1, due: false, missed: false, taken, takenAt: taken ? '8:05 AM' : null });

describe('medicine reminder timing', () => {
  it('reads Singapore time', () => {
    expect(sgNow(Date.parse('2026-10-07T11:50:00Z'))).toEqual({ date: '2026-10-07', minutes: 19 * 60 + 50 });
    expect(sgNow(Date.parse('2026-10-07T16:30:00Z'))).toEqual({ date: '2026-10-08', minutes: 30 });
  });

  it('reminds from 15 minutes before until taken, up to 3 hours late', () => {
    const doses = [dose('furo', 480), dose('biso', 480), dose('sv', 1200)];
    expect(dueReminder(doses, 464)).toBeNull();
    expect(dueReminder(doses, 465)).toEqual({ time: 480, label: '8 AM', names: ['Water pill', 'Heart rate pill'], dueInMin: 15 });
    expect(reminderText(dueReminder(doses, 479)!)).toBe('Your 8 AM pills are due in 1 minute');
    expect(reminderText(dueReminder(doses, 500)!)).toBe('Time for your 8 AM pills');
    expect(dueReminder(doses, 480 + 181)).toBeNull();
    // Taken pills drop off.
    expect(dueReminder([dose('furo', 480, true), dose('biso', 480)], 480)?.names).toEqual(['Heart rate pill']);
    expect(dueReminder([dose('furo', 480, true)], 480)).toBeNull();
  });
});

describe('medicine reminder in the app', () => {
  beforeEach(() => {
    localStorage.clear();
    // 7:50 PM in Singapore on the demo day: the 8 PM heart helper is not taken yet.
    vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-10-07T11:50:00Z') });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    sessionStorage.clear();
  });

  it('shows a banner on every screen until the Medicine screen', async () => {
    const user = await loginAsDemo();
    const banner = await screen.findByRole('link', { name: /Your 8 PM pills are due in 10 minutes/ });
    expect(within(banner).getByText('Heart helper')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Track' }));
    expect(await screen.findByRole('link', { name: /Your 8 PM pills are due in 10 minutes/ })).toBeTruthy();

    await user.click(screen.getByRole('link', { name: /Your 8 PM pills are due in 10 minutes/ }));
    await screen.findByRole('heading', { level: 1, name: 'Medicine' });
    expect(screen.queryByRole('link', { name: /Your 8 PM pills/ })).toBeNull();
  });

  it('demos the reminder from Demo tools: a phone notification and the banner, whatever the time', async () => {
    // A time when nothing is due.
    vi.setSystemTime(new Date('2026-10-07T03:00:00Z'));
    const shown: Array<{ title: string; body?: string }> = [];
    const Fake = Object.assign(function Notification(title: string, options?: NotificationOptions) { shown.push({ title, body: options?.body }); }, { permission: 'granted' });
    vi.stubGlobal('Notification', Fake);
    const user = await loginAsDemo();
    expect(screen.queryByRole('link', { name: /pills are due/ })).toBeNull();

    await user.click(screen.getByRole('button', { name: 'More' }));
    await user.click(await screen.findByRole('button', { name: 'Demo: medicine reminder' }));

    // The next pills still to take: the 8 PM heart helper.
    expect(await screen.findByRole('link', { name: /Your 8 PM pills are due in 15 minutes/ })).toBeTruthy();
    expect(shown).toEqual([{ title: 'Your 8 PM pills are due in 15 minutes', body: 'Heart helper' }]);
  });

  it('turns on phone reminders from the Medicine screen', async () => {
    const requestPermission = vi.fn(async () => 'granted' as NotificationPermission);
    vi.stubGlobal('Notification', Object.assign(function Notification() {}, { permission: 'default', requestPermission }));
    const user = await loginAsDemo();
    await user.click(screen.getByRole('button', { name: 'Medicine' }));

    const setting = await screen.findByRole('region', { name: 'Phone reminders' });
    await user.click(within(setting).getByRole('button', { name: 'Remind me on this phone' }));
    expect(requestPermission).toHaveBeenCalled();
    expect(await within(setting).findByText(/Phone reminders are on\./)).toBeTruthy();
  });
});
