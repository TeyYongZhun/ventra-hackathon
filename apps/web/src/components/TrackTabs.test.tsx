import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TrackTabs } from './TrackTabs';

describe('TrackTabs', () => {
  it('renders three tabs with correct labels', () => {
    render(<TrackTabs activeTab="drinks" onChange={() => {}} />);
    expect(screen.getByRole('tab', { name: /Log drinks/i })).toBeTruthy();
    expect(screen.getByRole('tab', { name: /Scan meal/i })).toBeTruthy();
    expect(screen.getByRole('tab', { name: /Log weight/i })).toBeTruthy();
  });

  it('marks the active tab with aria-selected', () => {
    render(<TrackTabs activeTab="meal" onChange={() => {}} />);
    expect(screen.getByRole('tab', { name: /Scan meal/i }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByRole('tab', { name: /Log drinks/i }).getAttribute('aria-selected')).toBe('false');
  });

  it('calls onChange when a tab is clicked', async () => {
    const onChange = vi.fn();
    render(<TrackTabs activeTab="drinks" onChange={onChange} />);
    await userEvent.click(screen.getByRole('tab', { name: /Log weight/i }));
    expect(onChange).toHaveBeenCalledWith('weight');
  });
});
