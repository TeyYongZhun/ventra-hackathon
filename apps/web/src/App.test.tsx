import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';

function createQC() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function Wrapper({ initialEntries = ['/'] }: { initialEntries?: string[] }) {
  const qc = createQC();
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={initialEntries}>
        <App />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('App routing', () => {
  it('shows login page for unauthenticated users', async () => {
    render(<Wrapper />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Log in as demo patient/i })).toBeTruthy();
    });
  });

  it('redirects to login from protected routes when not authenticated', async () => {
    render(<Wrapper initialEntries={['/home']} />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Log in as demo patient/i })).toBeTruthy();
    });
  });
});
