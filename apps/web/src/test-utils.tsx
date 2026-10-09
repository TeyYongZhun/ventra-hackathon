import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';

// Logs in through the real Login page (mock API: Mdm Tan on 7 Oct, 9:41 AM) and waits for Home.
// The daily note is marked as seen so it doesn't cover the screen.
export async function loginAsDemo() {
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
  return user;
}
