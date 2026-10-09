import { beforeEach, describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import { loginAsDemo } from '../test-utils';

async function openAsk() {
  const user = await loginAsDemo();
  const menu = screen.getByRole('navigation', { name: 'Main menu' });
  await user.click(within(menu).getByRole('button', { name: 'Ask AI' }));
  await screen.findByRole('heading', { level: 1, name: 'Ask AI' });
  return user;
}

describe('Ask AI', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('greets the patient and offers ideas', async () => {
    await openAsk();
    expect(screen.getByRole('heading', { name: 'Hello, Mdm Tan' })).toBeTruthy();
    const ideas = screen.getByRole('region', { name: 'Ideas' });
    expect(within(ideas).getAllByRole('button')).toHaveLength(3);
  });

  it('shows the SOS card for an emergency and links to SOS', async () => {
    const user = await openAsk();

    await user.type(screen.getByRole('textbox', { name: 'Ask a question' }), "I can't breathe{Enter}");

    const card = await screen.findByRole('alert', { name: 'Get help now' });
    expect(within(card).getByText('Please call 995 now.')).toBeTruthy();
    expect(within(card).getByRole('link', { name: 'Press SOS' }).getAttribute('href')).toBe('/emergency');
  });

  it('shows the nurse card with the fixed line for a dose question', async () => {
    const user = await openAsk();

    await user.type(screen.getByRole('textbox', { name: 'Ask a question' }), 'Can I skip my water pill?');
    await user.click(screen.getByRole('button', { name: 'Send' }));

    const card = await screen.findByRole('region', { name: 'Please ask your nurse' });
    expect(within(card).getByText("I can't advise on that. Please ask your pharmacist or doctor.")).toBeTruthy();
    expect(within(card).getByRole('link', { name: 'Call my nurse' }).getAttribute('href')).toBe('/nurse');
  });

  it('shows my question and the answer as chat bubbles', async () => {
    const user = await openAsk();

    await user.click(screen.getByRole('button', { name: 'What is my water pill for?' }));

    const log = await screen.findByRole('log', { name: 'Conversation' });
    expect(within(log).getByText('What is my water pill for?')).toBeTruthy();
    expect(await within(log).findByText(/helps your body pass extra salt and water/)).toBeTruthy();
    expect(screen.queryByRole('region', { name: 'Welcome' })).toBeNull();
  });

  it('does not send an empty question', async () => {
    await openAsk();
    expect((screen.getByRole('button', { name: 'Send' }) as HTMLButtonElement).disabled).toBe(true);
  });
});
