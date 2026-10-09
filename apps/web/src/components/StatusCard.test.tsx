import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusCard } from './StatusCard';

describe('StatusCard', () => {
  it('renders green variant with headline and subtext', () => {
    render(<StatusCard variant="green" headline="All good" subText="Keep going" />);
    const status = screen.getByRole('status');
    expect(status).toBeTruthy();
    expect(status.textContent).toContain('All good');
    expect(screen.getByText('Keep going')).toBeTruthy();
  });

  it('renders yellow variant with headline and subtext', () => {
    render(<StatusCard variant="yellow" headline="Warning" subText="Check in" />);
    const status = screen.getByRole('status');
    expect(status).toBeTruthy();
    expect(status.textContent).toContain('Warning');
    expect(screen.getByText('Check in')).toBeTruthy();
  });
});
