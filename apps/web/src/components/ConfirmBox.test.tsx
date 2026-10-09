import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmBox } from './ConfirmBox';

describe('ConfirmBox', () => {
  it('renders title, message and both buttons', () => {
    render(
      <ConfirmBox
        title="Are you sure?"
        message="This cannot be undone."
        primaryAction={{ label: 'Yes', onClick: () => {} }}
        secondaryAction={{ label: 'Cancel', onClick: () => {} }}
      />
    );
    expect(screen.getByRole('alertdialog')).toBeTruthy();
    expect(screen.getByText('Are you sure?')).toBeTruthy();
    expect(screen.getByText('This cannot be undone.')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Yes/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Cancel/i })).toBeTruthy();
  });

  it('calls primary action on click', async () => {
    const primary = vi.fn();
    const secondary = vi.fn();
    render(
      <ConfirmBox
        title="Test"
        message="Msg"
        primaryAction={{ label: 'Go', onClick: primary }}
        secondaryAction={{ label: 'Back', onClick: secondary }}
      />
    );
    await userEvent.click(screen.getByRole('button', { name: /Go/i }));
    expect(primary).toHaveBeenCalledTimes(1);
    expect(secondary).not.toHaveBeenCalled();
  });
});
