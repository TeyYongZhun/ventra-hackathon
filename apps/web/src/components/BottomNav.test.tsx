import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BottomNav } from './BottomNav';

describe('BottomNav', () => {
  it('renders five navigation tabs', () => {
    render(<BottomNav activeTab="home" onChange={() => {}} />);
    expect(screen.getByRole('button', { name: /Home/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Track/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Ask AI/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Medicine/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /More/i })).toBeTruthy();
  });

  it('marks active tab with aria-current', () => {
    render(<BottomNav activeTab="ask" onChange={() => {}} />);
    expect(screen.getByRole('button', { name: /Ask AI/i }).getAttribute('aria-current')).toBe('page');
  });

  it('calls onChange when a tab is clicked', async () => {
    const onChange = vi.fn();
    render(<BottomNav activeTab="home" onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: /Medicine/i }));
    expect(onChange).toHaveBeenCalledWith('medicine');
  });
});
