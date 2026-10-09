import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExpandCard } from './ExpandCard';

describe('ExpandCard', () => {
  it('renders title and collapsed state by default', () => {
    render(
      <ExpandCard title="Details">
        <p>Hidden content</p>
      </ExpandCard>
    );
    const btn = screen.getByRole('button', { name: /Details/i });
    expect(btn).toBeTruthy();
    expect(btn.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByText('Hidden content')).toBeFalsy();
  });

  it('expands to show children when clicked', async () => {
    render(
      <ExpandCard title="Details">
        <p>Hidden content</p>
      </ExpandCard>
    );
    await userEvent.click(screen.getByRole('button', { name: /Details/i }));
    expect(screen.getByRole('button', { name: /Details/i }).getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByText('Hidden content')).toBeTruthy();
  });

  it('renders open when defaultOpen is true', () => {
    render(
      <ExpandCard title="Details" defaultOpen>
        <p>Visible content</p>
      </ExpandCard>
    );
    expect(screen.getByRole('button', { name: /Details/i }).getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByText('Visible content')).toBeTruthy();
  });
});
