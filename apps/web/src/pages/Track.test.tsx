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
  // 850 ml from the seed, plus whatever earlier tests in this file logged and didn't undo.
  await screen.findByText(/of 1,500 ml drunk/);
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
    expect(screen.getByRole('link', { name: '1 full cap = 150 ml · Change my cap size' }).getAttribute('href')).toBe('/cap');
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

    expect(await screen.findByRole('link', { name: 'Type my weight' })).toBeTruthy();
  });
});

describe('Track · change cap size', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('opens from the drinks tab, starts on the current size and saves back to drinks', async () => {
    const user = await openTrack();

    await user.click(screen.getByRole('link', { name: /1 full cap = 150 ml · Change my cap size/ }));
    expect(await screen.findByRole('heading', { level: 1, name: 'How much does your cap hold?' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Back to drinks' }).getAttribute('href')).toBe('/track?tab=drinks');
    expect(screen.getByRole('link', { name: /Emergency SOS/i })).toBeTruthy();

    const sizes = screen.getByRole('radiogroup', { name: 'Cap size' });
    expect(within(sizes).getByRole('radio', { name: '150 ml' }).getAttribute('aria-checked')).toBe('true');

    await user.click(within(sizes).getByRole('radio', { name: 'Other' }));
    await user.click(screen.getByRole('button', { name: '10 ml more' }));
    expect(within(sizes).getByRole('radio', { name: 'Other · 190 ml' }).getAttribute('aria-checked')).toBe('true');

    await user.click(screen.getByRole('button', { name: 'Save cap size' }));
    expect(await screen.findByRole('tabpanel', { name: 'Log drinks' })).toBeTruthy();
  });
});

describe('Track · drink limit', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // Last in the file: it leaves the mock API over the limit.
  it('warns the moment drinks reach the limit, and keeps a warning while over', async () => {
    const user = await openTrack();
    const drinks = screen.getByRole('region', { name: "Today's drinks" });

    // 850 of 1,500 ml: four full caps stay under the limit…
    for (const total of ['1,000', '1,150', '1,300', '1,450']) {
      await user.click(screen.getByRole('button', { name: 'Add Full cap, 150 ml' }));
      await within(drinks).findByText(`${total} of 1,500 ml drunk`);
    }
    expect(screen.getByText('Almost at your limit. Small sips for the rest of today.')).toBeTruthy();
    expect(screen.queryByRole('alertdialog')).toBeNull();

    // …the fifth goes 100 ml over: a pop-up, then a banner that stays.
    await user.click(screen.getByRole('button', { name: 'Add Full cap, 150 ml' }));
    const warning = await screen.findByRole('alertdialog', { name: "You're 100 ml over today's drink limit" });
    expect(within(warning).getByText(/Your limit is 1,500 ml\. Try to drink only small sips until tomorrow\./)).toBeTruthy();
    await user.click(within(warning).getByRole('button', { name: 'OK, I understand' }));
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(screen.getByRole('alert', { name: "You're 100 ml over today's drink limit" })).toBeTruthy();
    expect(screen.queryByText('Almost at your limit. Small sips for the rest of today.')).toBeNull();
    // SOS stays on screen.
    expect(screen.getByRole('link', { name: /Emergency SOS/i })).toBeTruthy();
  });
});
