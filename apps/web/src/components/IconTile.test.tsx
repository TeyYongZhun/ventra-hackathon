import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { IconTile } from './IconTile';

describe('IconTile', () => {
  it('renders label and icon', () => {
    render(<IconTile icon={<span data-testid="icon" />} label="Drinks" />);
    expect(screen.getByText('Drinks')).toBeTruthy();
    expect(screen.getByTestId('icon')).toBeTruthy();
  });

  it('renders badge when provided', () => {
    render(<IconTile icon={<span />} label="Medicine" badge={3} />);
    expect(screen.getByText('3')).toBeTruthy();
  });

  it('does not render badge when omitted', () => {
    render(<IconTile icon={<span />} label="Meals" />);
    expect(screen.queryByText('3')).toBeFalsy();
  });
});
