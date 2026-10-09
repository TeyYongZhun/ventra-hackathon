import { beforeAll, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import { loginAsDemo } from './test-utils';

// Every screen after login shows the red SOS button (CODEBUDDY.md rule). Pages put it in their
// own header now (PageHeader / Home date row), so check the real pages, not the Layout.
const ROUTES = [
  '/home', '/track?tab=drinks', '/track?tab=meal', '/track?tab=weight', '/medicine', '/ask', '/more',
  '/alert', '/status/green', '/status/yellow', '/status/red', '/nurse', '/family', '/report', '/report/full',
  '/weigh', '/weigh/how', '/feel', '/cap', '/privacy', '/settings/text', '/visit',
  '/settings', '/settings/numbers', '/settings/medicines', '/settings/contact',
];

function open(route: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[route]}>
        <App />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('SOS on every screen', () => {
  // The mock API keeps its session for the whole file, so log in once.
  beforeAll(async () => {
    await loginAsDemo();
    cleanup();
  });

  it.each(ROUTES)('shows SOS on %s', async (route) => {
    open(route);
    expect(await screen.findByRole('link', { name: /Emergency SOS/i })).toBeTruthy();
  });
});
