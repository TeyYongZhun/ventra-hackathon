import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, screen, within } from '@testing-library/react';
import { loginAsDemo } from '../test-utils';

// Calendar (More tab): visits from the mock API (heart clinic on 13 Oct, blood test on 27 Oct;
// the mock day is 7 Oct).
async function openCalendar() {
  const user = await loginAsDemo();
  await user.click(screen.getByRole('button', { name: 'More' }));
  await screen.findByRole('heading', { level: 1, name: 'Calendar' });
  return user;
}

describe('Visits', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('shows the next visit large and later visits small, with visit days on the calendar', async () => {
    await openCalendar();
    const next = await screen.findByRole('region', { name: /^Next visit: Heart clinic/ });
    expect(within(next).getByText('IN 6 DAYS')).toBeTruthy();
    expect(within(next).getByText('Dr Lim · Level 3, Room 12')).toBeTruthy();
    expect(within(next).getByText('Medicine list · this phone · IC card')).toBeTruthy();
    expect(within(next).getByRole('link', { name: 'Get ready for this visit' }).getAttribute('href')).toBe('/visit');

    const later = screen.getByRole('region', { name: /^Visit: Blood test/ });
    expect(within(later).getByText('9:00 AM · Polyclinic lab')).toBeTruthy();
    expect(screen.getByRole('img', { name: 'October 13, clinic visit' })).toBeTruthy();
  });

  it('adds a visit, then removes it after asking', async () => {
    const user = await openCalendar();
    await user.click(await screen.findByRole('link', { name: 'Add a visit' }));
    await screen.findByRole('heading', { level: 1, name: 'Add a visit' });

    await user.click(screen.getByRole('button', { name: 'Pharmacy' }));
    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2026-10-20' } });
    fireEvent.change(screen.getByLabelText('Time'), { target: { value: '14:30' } });
    await user.type(screen.getByLabelText('Where (optional)'), 'Block 123 pharmacy');
    await user.click(screen.getByRole('button', { name: 'Save visit' }));

    const added = await screen.findByRole('region', { name: /^Visit: Pharmacy/ });
    expect(within(added).getByText('2:30 PM · Block 123 pharmacy')).toBeTruthy();

    await user.click(within(added).getByRole('button', { name: 'Remove' }));
    await user.click(within(added).getByRole('button', { name: 'Yes, remove' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Calendar' })).toBeTruthy();
    await screen.findByRole('region', { name: /^Visit: Blood test/ });
    expect(screen.queryByRole('region', { name: /^Visit: Pharmacy/ })).toBeNull();
  });
});
