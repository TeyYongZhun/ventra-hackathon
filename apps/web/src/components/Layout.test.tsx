import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Layout } from './Layout';

function createQC() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function wrapper(route: string) {
  const qc = createQC();
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[route]}>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/home" element={<div>Home page</div>} />
            <Route path="/track" element={<div>Track page</div>} />
            <Route path="/medicine" element={<div>Medicine page</div>} />
            <Route path="/ask" element={<div>Ask AI page</div>} />
            <Route path="/more" element={<div>More page</div>} />
            <Route path="/emergency" element={<div>Emergency page</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('Layout SOS button coverage', () => {
  const routes = ['/home', '/track', '/medicine', '/ask', '/more', '/emergency'];

  it.each(routes)('renders SOS button on %s', (route) => {
    wrapper(route);
    expect(screen.getByRole('link', { name: /Emergency SOS/i })).toBeTruthy();
  });
});

describe('Layout BottomNav', () => {
  it('marks the active tab', () => {
    wrapper('/track');
    expect(screen.getByRole('button', { name: /Track/i }).getAttribute('aria-current')).toBe('page');
  });
});
