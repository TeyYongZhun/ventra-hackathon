import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SOSButton } from './SOSButton';

describe('SOSButton', () => {
  it('renders with emergency link and aria-label', () => {
    render(
      <MemoryRouter>
        <SOSButton />
      </MemoryRouter>
    );
    const btn = screen.getByRole('link', { name: /Emergency SOS/i });
    expect(btn).toBeTruthy();
    expect(btn.getAttribute('href')).toBe('/emergency');
  });
});
