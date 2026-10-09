import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from '../App';

// Logs in through the real Login page (mock API, demo patient on 7 Oct) and lands on Home.
async function openHome() {
  const user = userEvent.setup();
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/login']}>
        <App />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  await user.click(await screen.findByRole('button', { name: /Log in as demo patient/i }));
  await screen.findByRole('heading', { level: 1, name: /, Mdm Tan$/ });
  return user;
}

describe('Home', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('shows the date, greeting and green status from the metrics', async () => {
    await openHome();

    expect(screen.getByText('Wed, 7 October')).toBeTruthy();
    const status = screen.getByText('GREEN · ALL GOOD').closest('[role="status"]') as HTMLElement;
    expect(status).toBeTruthy();
    expect(within(status).getByText("You're on track today")).toBeTruthy();
    expect(within(status).getByText('Your weight is steady and you took all your morning medicines.')).toBeTruthy();
  });

  it('shows all nine tiles and the pills still to take', async () => {
    await openHome();

    const grid = screen.getByRole('navigation', { name: 'Go to' });
    expect(within(grid).getAllByRole('button')).toHaveLength(9);
    expect(within(grid).getByRole('button', { name: 'Medicine, 1 pill still to take today' })).toBeTruthy();
    expect(within(grid).getByRole('button', { name: 'Calendar, today is Wed, 7 October' })).toBeTruthy();
  });

  it('shows the daily note once a day', async () => {
    const user = await openHome();

    const note = await screen.findByRole('dialog', { name: "You're doing so well!" });
    expect(within(note).getByText(/You have weighed yourself 11 mornings in a row\./)).toBeTruthy();
    await user.click(within(note).getByRole('button', { name: 'Thank you!' }));

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(localStorage.getItem('ventra.note.2026-10-07')).toBe('1');
  });

  it('skips the note when it was already seen today', async () => {
    localStorage.setItem('ventra.note.2026-10-07', '1');
    await openHome();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('keeps the SOS button reachable while the note is open', async () => {
    await openHome();
    await screen.findByRole('dialog');
    expect(screen.getByRole('link', { name: /Emergency SOS/i })).toBeTruthy();
  });

  it('opens the drinks tab from the Drinks tile', async () => {
    localStorage.setItem('ventra.note.2026-10-07', '1');
    const user = await openHome();

    await user.click(screen.getByRole('button', { name: 'Drinks' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Track' })).toBeTruthy();
    expect(await screen.findByText('850 of 1,500 ml drunk')).toBeTruthy();
  });
});
