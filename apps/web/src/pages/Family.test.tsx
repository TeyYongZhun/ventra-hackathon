import { beforeEach, describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import { loginAsDemo } from '../test-utils';

async function openMore() {
  const user = await loginAsDemo();
  await user.click(screen.getByRole('button', { name: 'More' }));
  await screen.findByRole('heading', { level: 1, name: 'More' });
  return user;
}

describe('More, alert, nurse call and family', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('shows demo tools to the demo patient', async () => {
    await openMore();
    const tools = screen.getByRole('region', { name: 'Demo tools' });
    expect(within(tools).getByRole('button', { name: /Start yellow-day demo/ })).toBeTruthy();
    expect(within(tools).getByRole('button', { name: 'Reset demo day' })).toBeTruthy();
  });

  it('shows the alert with reasons, the nurse script and whether family was told', async () => {
    const user = await openMore();
    await user.click(screen.getByRole('link', { name: /My alert and nurse script/ }));

    expect(await screen.findByText('YELLOW · CALL TODAY')).toBeTruthy();
    expect(screen.getByText('Alert · Sat, 3 October, 6:10 PM')).toBeTruthy();
    const noticed = screen.getByRole('list', { name: 'What we noticed' });
    expect(within(noticed).getByText('Missed water pill (8 AM)')).toBeTruthy();
    const script = screen.getByRole('region', { name: 'Read this to the nurse' });
    expect(within(script).getByText('1,750 ml')).toBeTruthy();
    expect(screen.getByText(/has been told\./)).toBeTruthy();
  });

  it('opens a simulated nurse call', async () => {
    const user = await openMore();
    await user.click(screen.getByRole('link', { name: /My alert and nurse script/ }));
    await user.click(await screen.findByRole('link', { name: /Call heart nurse/ }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Heart Failure Nurse' })).toBeTruthy();
    expect(screen.getByText('Calling…')).toBeTruthy();
    expect(screen.getByText('Demo only — no real call is made.')).toBeTruthy();
  });

  it('shows the family preview with alerts, status and medicines locked on', async () => {
    const user = await openMore();
    await user.click(screen.getByRole('link', { name: /Summary for my family/ }));

    const preview = await screen.findByRole('region', { name: 'Preview' });
    expect(within(preview).getByText('What Mei Ling will get')).toBeTruthy();
    expect(within(preview).getByText('Green — on track')).toBeTruthy();
    expect(screen.getAllByText('Always shared · for your safety')).toHaveLength(3);
    expect(screen.getAllByRole('switch')).toHaveLength(3);
  });

  it('adds weight to the preview when switched on, then sends the summary once', async () => {
    const user = await openMore();
    await user.click(screen.getByRole('link', { name: /Summary for my family/ }));
    const weight = await screen.findByRole('switch', { name: 'My weight' });

    await user.click(weight);
    const preview = screen.getByRole('region', { name: 'Preview' });
    expect(await within(preview).findByText('58.4 kg (steady)')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: "Send today's summary now" }));
    expect(await screen.findByText("Sent to Mei Ling for today. Tonight's 10 PM summary is skipped.")).toBeTruthy();
    expect((screen.getByRole('button', { name: "Send today's summary now" }) as HTMLButtonElement).disabled).toBe(true);
  });
});
