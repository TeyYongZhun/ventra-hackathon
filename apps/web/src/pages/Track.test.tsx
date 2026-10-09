import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from '../App';

// Logs in through the real Login page (mock API, demo patient), then opens Track from the bottom menu.
async function openTrack() {
  localStorage.setItem('ventra.note.2026-10-07', '1');
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
  await user.click(screen.getByRole('button', { name: 'Track' }));
  await screen.findByText('850 of 1,500 ml drunk');
  return user;
}

describe('Track · drinks tab', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('shows what is left today from the metrics', async () => {
    await openTrack();

    const drinks = screen.getByRole('region', { name: "Today's drinks" });
    expect(within(drinks).getByText('Left today')).toBeTruthy();
    expect(within(drinks).getByText('650')).toBeTruthy();
    expect(screen.getByRole('tab', { name: /Log drinks/ }).getAttribute('aria-selected')).toBe('true');
  });

  it('offers cap buttons sized to the patient cap', async () => {
    await openTrack();

    for (const name of ['Add ¼ cap, 38 ml', 'Add ½ cap, 75 ml', 'Add ¾ cap, 113 ml', 'Add Full cap, 150 ml']) {
      expect(screen.getByRole('button', { name })).toBeTruthy();
    }
    expect(screen.getByText('1 full cap = 150 ml')).toBeTruthy();
  });

  it("lists today's drinks", async () => {
    await openTrack();
    const list = screen.getByRole('list');
    expect(within(list).getByText('3:00 PM')).toBeTruthy();
    expect(within(list).getByText('300 ml')).toBeTruthy();
  });

  it('logs a drink and says so', async () => {
    const user = await openTrack();

    await user.click(screen.getByRole('button', { name: 'Add ½ cap, 75 ml' }));

    expect(await screen.findByText('Added 75 ml.')).toBeTruthy();
    expect(screen.getByText('+75 ml')).toBeTruthy();
  });

  it('undoes the last drink', async () => {
    const user = await openTrack();

    await user.click(screen.getByRole('button', { name: /Undo last/ }));

    expect(await screen.findByText('Last drink removed.')).toBeTruthy();
  });

  it('switches to the weight tab', async () => {
    const user = await openTrack();

    await user.click(screen.getByRole('tab', { name: /Log weight/ }));

    expect(await screen.findByText('Weight logging is coming soon.')).toBeTruthy();
  });
});
