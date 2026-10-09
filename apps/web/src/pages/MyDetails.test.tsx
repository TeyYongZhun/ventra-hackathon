import { beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { loginAsDemo } from '../test-utils';

// Calendar (More) → Change my setup → My details, not the sign-up set-up steps.
async function openDetails() {
  const user = await loginAsDemo();
  await user.click(screen.getByRole('button', { name: 'More' }));
  await user.click(await screen.findByRole('link', { name: /Change my setup/ }));
  await screen.findByRole('heading', { level: 1, name: 'My details' });
  return user;
}

describe('My details', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('lists the current details instead of starting set-up again', async () => {
    await openDetails();
    const list = screen.getByRole('navigation', { name: 'My details' });
    expect(within(list).getByRole('link', { name: /My numbers.*Dry weight 58\.0 kg/ })).toBeTruthy();
    expect(within(list).getByRole('link', { name: /My cap size.*1 full cap = 150 ml/ })).toBeTruthy();
    expect(screen.queryByText(/Step \d of/)).toBeNull();
  });

  it('opens my numbers filled in, and Back returns to My details', async () => {
    const user = await openDetails();
    await user.click(screen.getByRole('link', { name: /My numbers/ }));
    expect(await screen.findByRole('heading', { level: 1, name: 'My numbers' })).toBeTruthy();
    expect((screen.getByLabelText('Dry weight') as HTMLInputElement).value).toBe('58');
    expect((screen.getByLabelText('Drink limit per day') as HTMLInputElement).value).toBe('1500');

    await user.click(screen.getByRole('link', { name: 'Back to my details' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'My details' })).toBeTruthy();
  });

  it('saves my medicines and comes back with a note', async () => {
    const user = await openDetails();
    await user.click(screen.getByRole('link', { name: /My medicines/ }));
    await screen.findByRole('heading', { level: 1, name: 'My medicines' });
    expect(screen.getByRole('button', { name: /Water pill/ }).getAttribute('aria-pressed')).toBe('true');

    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Your medicines saved.')).toBeTruthy();
  });

  it('Large text makes the whole app smaller; Extra large is the normal size', async () => {
    const user = await openDetails();
    await user.click(screen.getByRole('link', { name: /Text size and sound.*Extra large text/ }));
    await screen.findByRole('heading', { level: 1, name: 'Make it easy to read and hear' });
    expect(screen.getByRole('button', { name: /^Extra large/ }).getAttribute('aria-pressed')).toBe('true');

    await user.click(screen.getByRole('button', { name: /^Large/ }));
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Text size and sound saved.')).toBeTruthy();
    await waitFor(() => expect(document.documentElement.style.zoom).toBe('0.8'));

    await user.click(screen.getByRole('link', { name: /Text size and sound.*Large text/ }));
    await user.click(await screen.findByRole('button', { name: /^Extra large/ }));
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(document.documentElement.style.zoom).toBe(''));
  });

  it('previews the text size as soon as it is tapped, and Back without saving undoes it', async () => {
    const user = await openDetails();
    await user.click(screen.getByRole('link', { name: /Text size and sound/ }));
    await screen.findByRole('heading', { level: 1, name: 'Make it easy to read and hear' });
    const before = document.documentElement.style.zoom;

    const other = before === '0.8' ? /^Extra large/ : /^Large/;
    await user.click(screen.getByRole('button', { name: other }));
    expect(document.documentElement.style.zoom).toBe(before === '0.8' ? '' : '0.8');

    await user.click(screen.getByRole('link', { name: 'Back to my details' }));
    await screen.findByRole('heading', { level: 1, name: 'My details' });
    expect(document.documentElement.style.zoom).toBe(before);
  });

  it('cap size from My details goes back to My details', async () => {
    const user = await openDetails();
    await user.click(screen.getByRole('link', { name: /My cap size/ }));
    await screen.findByRole('heading', { level: 1, name: 'How much does your cap hold?' });
    expect(screen.getByRole('link', { name: 'Back to my details' }).getAttribute('href')).toBe('/settings');
  });
});
