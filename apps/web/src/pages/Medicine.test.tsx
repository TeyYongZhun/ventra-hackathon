import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from '../App';

// Logs in through the real Login page (mock API: Mdm Tan, 7 Oct 9:41 AM) and opens Medicine.
async function openMedicine() {
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
  await user.click(screen.getByRole('button', { name: 'Medicine' }));
  await screen.findByRole('heading', { level: 1, name: 'Medicine' });
  return user;
}

describe('Medicine', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("groups today's doses into morning and evening", async () => {
    await openMedicine();

    const morning = screen.getByRole('region', { name: 'Morning medicines' });
    expect(within(morning).getByRole('heading', { name: 'Morning · 8 AM' })).toBeTruthy();
    expect(within(morning).getByText('All taken')).toBeTruthy();
    expect(within(morning).getAllByText('Taken at 8:05 AM')).toHaveLength(4);

    const evening = screen.getByRole('region', { name: 'Evening medicines' });
    expect(within(evening).getByRole('heading', { name: 'Evening · 8 PM' })).toBeTruthy();
    expect(within(evening).getByText('Not yet')).toBeTruthy();
    expect(within(evening).getByText('Due at 8 PM')).toBeTruthy();
  });

  it('opens the next dose with what it is for and how it looks', async () => {
    await openMedicine();

    const evening = screen.getByRole('region', { name: 'Evening medicines' });
    expect(within(evening).getByRole('button', { name: /Heart helper/, expanded: true })).toBeTruthy();
    expect(within(evening).getByText('Sacubitril/Valsartan 49/51 mg · 2 of 2')).toBeTruthy();
    expect(within(evening).getByText('Relaxes your blood vessels so your heart pumps more easily.')).toBeTruthy();
  });

  it('asks before saving, and "Not yet" saves nothing', async () => {
    const user = await openMedicine();
    const evening = screen.getByRole('region', { name: 'Evening medicines' });

    await user.click(within(evening).getByRole('button', { name: 'I took it' }));
    const check = within(evening).getByRole('group', { name: 'Check before saving' });
    expect(within(check).getByText('Did you just take your heart helper?')).toBeTruthy();
    expect(within(check).getByText("You can't change this after you say yes.")).toBeTruthy();

    await user.click(within(check).getByRole('button', { name: 'Not yet' }));
    expect(within(evening).queryByRole('group', { name: 'Check before saving' })).toBeNull();
    expect(within(evening).getByRole('button', { name: 'I took it' })).toBeTruthy();
  });

  it('confirms the evening pill and locks it', async () => {
    const user = await openMedicine();
    const evening = screen.getByRole('region', { name: 'Evening medicines' });

    await user.click(within(evening).getByRole('button', { name: 'I took it' }));
    await user.click(within(evening).getByRole('button', { name: 'Yes, I took it' }));

    expect(await within(evening).findByRole('status', { name: 'Taken at 8:05 AM. This can no longer be changed.' })).toBeTruthy();
    expect(within(evening).queryByRole('button', { name: 'I took it' })).toBeNull();
    expect(within(evening).getByText('All taken')).toBeTruthy();
  });
});
