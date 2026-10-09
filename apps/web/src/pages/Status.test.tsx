import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from '../App';

// Logs in as the demo patient (green on 7 Oct, mock API) and opens the green explainer from Home.
async function openStatus() {
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
  await user.click(await screen.findByRole('link', { name: /See what green means/ }));
  await screen.findByRole('heading', { level: 1, name: 'My status' });
  return user;
}

describe('Status', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('opens green from the Home card and marks it as today', async () => {
    await openStatus();

    const hero = screen.getByRole('region', { name: 'Status: green' });
    expect(within(hero).getByText('TODAY')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Keep doing this' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Back to today' }).getAttribute('href')).toBe('/home');
    expect(screen.getByRole('link', { name: /Emergency SOS/i })).toBeTruthy();
  });

  it('switches to yellow and red without calling them today', async () => {
    const user = await openStatus();
    const colours = screen.getByRole('navigation', { name: 'What the colours mean' });

    await user.click(within(colours).getByRole('link', { name: 'Yellow' }));
    const yellow = screen.getByRole('region', { name: 'Status: yellow' });
    expect(within(yellow).getByText('IF YOU SEE')).toBeTruthy();
    expect(screen.getByRole('link', { name: /Call heart nurse/ }).getAttribute('href')).toBe('/nurse');
    expect(screen.getByRole('link', { name: 'What to say to the nurse' }).getAttribute('href')).toBe('/alert');

    await user.click(within(colours).getByRole('link', { name: 'Red' }));
    expect(within(screen.getByRole('region', { name: 'Status: red' })).getByText('IF YOU SEE')).toBeTruthy();
    expect(screen.getByRole('link', { name: /Call 995/ }).getAttribute('href')).toBe('/emergency');
    expect(screen.getByRole('heading', { name: 'While you wait' })).toBeTruthy();
    expect(within(colours).getByRole('link', { name: 'Red' }).getAttribute('aria-current')).toBe('page');
  });
});
