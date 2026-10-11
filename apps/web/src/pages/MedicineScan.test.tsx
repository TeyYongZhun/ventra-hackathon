import { beforeEach, describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import { loginAsDemo } from '../test-utils';

// jsdom has no camera, so the scanner falls back to typing the number under the barcode.
async function openScanner() {
  const user = await loginAsDemo();
  await user.click(screen.getByRole('button', { name: 'Medicine' }));
  await user.click(await screen.findByRole('link', { name: /Scan a medicine box/ }));
  await screen.findByRole('heading', { level: 1, name: 'Scan' });
  return user;
}

async function typeBarcode(user: Awaited<ReturnType<typeof openScanner>>, code: string) {
  await user.type(await screen.findByLabelText('Number under the barcode'), code);
  await user.click(screen.getByRole('button', { name: 'Check this number' }));
}

describe('Scan a medicine box', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("explains one of the patient's own medicines", async () => {
    const user = await openScanner();
    expect(screen.getByRole('alert').textContent).toMatch(/couldn't open the camera/);

    await typeBarcode(user, '2000000000022');
    const found = await screen.findByRole('region', { name: 'Found it' });
    expect(within(found).getByRole('heading', { name: 'Heart rate pill' })).toBeTruthy();
    expect(within(found).getByText('Bisoprolol 2.5 mg')).toBeTruthy();
    expect(within(found).getByText('As your doctor told you: 8 AM. Swallow with water.')).toBeTruthy();
    expect(within(found).getByText('When to call the nurse')).toBeTruthy();
    expect(within(found).getByRole('img', { name: 'Pill: small pale-yellow round tablet' })).toBeTruthy();
    expect(screen.getByText('Found: Heart rate pill')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Back to my medicines' }).getAttribute('href')).toBe('/medicine');
  });

  it('warns about a medicine that is not on the list', async () => {
    const user = await openScanner();
    await typeBarcode(user, '2000000000053');
    const notYours = await screen.findByRole('region', { name: 'Not on your list' });
    expect(within(notYours).getByRole('heading', { name: 'Heart and kidney pill' })).toBeTruthy();
    expect(within(notYours).getByText(/not one of your medicines\. Please ask your pharmacist or nurse/)).toBeTruthy();
    expect(within(notYours).queryByText('How to take it')).toBeNull();
    expect(screen.getByRole('link', { name: 'Call my nurse' }).getAttribute('href')).toBe('/nurse');
  });

  it("says when it doesn't know a box, and can scan again", async () => {
    const user = await openScanner();
    await typeBarcode(user, '2009990000012');
    const unknown = await screen.findByRole('region', { name: 'Unknown product' });
    expect(within(unknown).getByRole('heading', { name: "I don't know this product" })).toBeTruthy();
    expect(within(unknown).getByText('Please ask your pharmacist before you take it.')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Try scanning again' }));
    expect(screen.queryByRole('region', { name: 'Unknown product' })).toBeNull();
    expect((await screen.findByLabelText('Number under the barcode') as HTMLInputElement).value).toBe('');
  });
});
