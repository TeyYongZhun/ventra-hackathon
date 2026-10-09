import { beforeEach, describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import { loginAsDemo } from '../test-utils';

async function openFeel() {
  const user = await loginAsDemo();
  await user.click(screen.getByRole('button', { name: 'How I feel' }));
  await screen.findByRole('heading', { level: 1, name: 'How I feel' });
  return user;
}

describe('How I feel', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('asks how bad once a symptom is picked, and saves it', async () => {
    const user = await openFeel();
    expect(screen.queryByRole('radiogroup', { name: 'How bad' })).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Swollen ankles' }));
    const howBad = screen.getByRole('radiogroup', { name: 'How bad' });
    await user.click(within(howBad).getByRole('radio', { name: 'Medium' }));
    await user.click(screen.getByRole('button', { name: 'Save how I feel' }));

    expect(await screen.findByText('Saved. Thank you for telling us.')).toBeTruthy();
  });

  it('points to SOS when breathing is picked', async () => {
    const user = await openFeel();
    await user.click(screen.getByRole('button', { name: 'Short of breath' }));
    expect(screen.getByRole('alert').textContent).toContain('If breathing is very hard right now, press the red SOS button at the top.');
  });

  it('says thanks for "I feel fine" without saving symptoms', async () => {
    const user = await openFeel();
    await user.click(screen.getByRole('button', { name: 'I feel fine' }));
    await user.click(screen.getByRole('button', { name: 'Save how I feel' }));
    expect(await screen.findByText('Good to hear. Thank you for checking in.')).toBeTruthy();
  });

  it('keeps SOS on screen', async () => {
    await openFeel();
    expect(screen.getByRole('link', { name: /Emergency SOS/i })).toBeTruthy();
  });
});
