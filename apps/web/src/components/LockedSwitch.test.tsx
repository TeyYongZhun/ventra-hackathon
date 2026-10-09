import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LockedSwitch } from './LockedSwitch';

describe('LockedSwitch', () => {
  it('renders with ON state and lock icon', () => {
    render(<LockedSwitch label="Family sharing" />);
    expect(screen.getByLabelText(/Family sharing, locked on/i)).toBeTruthy();
    expect(screen.getByText('ON')).toBeTruthy();
  });

  it('renders without label', () => {
    render(<LockedSwitch />);
    expect(screen.getByLabelText(/Locked on/i)).toBeTruthy();
  });
});
