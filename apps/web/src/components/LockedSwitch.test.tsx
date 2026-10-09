import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LockedSwitch } from './LockedSwitch';

describe('LockedSwitch', () => {
  it('is announced as locked on (no visible ON label, as in the design)', () => {
    render(<LockedSwitch label="Family sharing" />);
    expect(screen.getByLabelText(/Family sharing, locked on/i)).toBeTruthy();
  });

  it('renders without label', () => {
    render(<LockedSwitch />);
    expect(screen.getByLabelText(/Locked on/i)).toBeTruthy();
  });
});
