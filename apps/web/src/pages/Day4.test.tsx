import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from '../App';
import { loginAsDemo } from '../test-utils';

async function openTrackTab(tab: RegExp) {
  const user = await loginAsDemo();
  const menu = screen.getByRole('navigation', { name: 'Main menu' });
  await user.click(within(menu).getByRole('button', { name: 'Track' }));
  await user.click(await screen.findByRole('tab', { name: tab }));
  return user;
}

describe('Day 4 screens', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('meals', () => {
    it("shows today's salt against the limit and the food list", async () => {
      await openTrackTab(/Log meals/);
      const salt = await screen.findByRole('region', { name: "Today's salt" });
      expect(within(salt).getByText('400')).toBeTruthy();
      expect(within(salt).getByText('1,600 of 2,000 mg eaten')).toBeTruthy();
      expect(within(salt).getByRole('img', { name: 'Bowl of salt, 80 percent of the way to the limit line' })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Add Chicken rice, about 1,300 mg salt' })).toBeTruthy();
    });

    it('logs a meal with its tip, then undoes it', async () => {
      const user = await openTrackTab(/Log meals/);
      await user.click(await screen.findByRole('button', { name: 'Add Chicken rice, about 1,300 mg salt' }));

      expect(await screen.findByText(/Chicken rice logged\. Ask for less dark sauce/)).toBeTruthy();
      const log = screen.getByRole('region', { name: "Today's food log" });
      expect(await within(log).findByText('Chicken rice')).toBeTruthy();

      await user.click(within(log).getByRole('button', { name: 'Undo last' }));
      expect(await screen.findByText('Last meal removed.')).toBeTruthy();
    });
  });

  describe('weight', () => {
    it("shows today's weight, the changes, the chart and the targets", async () => {
      await openTrackTab(/Log weight/);
      const today = await screen.findByRole('region', { name: "Today's weight" });
      expect(within(today).getByText('Steady — all good')).toBeTruthy();
      // Since yesterday (58.2 → 58.4) and over 3 days (58.2 → 58.4) are both +0.2 kg.
      expect(screen.getAllByText('+0.2 kg')).toHaveLength(2);
      expect(screen.getByRole('img', { name: /^Weight from .* to Wed, 7 October \(58\.4 kg\)$/ })).toBeTruthy();
      const targets = screen.getByRole('region', { name: 'My targets' });
      expect(within(targets).getByText('If you gain 2 kg or more in 3 days')).toBeTruthy();
    });

    it('types a weight on the keypad and saves it', async () => {
      const user = await openTrackTab(/Log weight/);
      await user.click(await screen.findByRole('link', { name: 'Type my weight' }));
      expect(await screen.findByRole('heading', { name: 'What does the scale say?' })).toBeTruthy();

      for (const key of ['5', '8', 'Decimal point', '6']) await user.click(screen.getByRole('button', { name: key }));
      expect(screen.getByText('58.6')).toBeTruthy();

      await user.click(screen.getByRole('button', { name: 'Save my weight' }));
      expect(await screen.findByRole('link', { name: 'Type my weight' })).toBeTruthy();
    });

    it('warns about a big jump before saving', async () => {
      const user = await openTrackTab(/Log weight/);
      await user.click(await screen.findByRole('link', { name: 'Type my weight' }));
      for (const key of ['6', '1']) await user.click(await screen.findByRole('button', { name: key }));
      expect(screen.getByRole('alert').textContent).toContain('2 kg or more away from last time');
    });
  });

  describe('report', () => {
    it('shows the doctor report with the same numbers as the app', async () => {
      const user = await loginAsDemo();
      await user.click(screen.getByRole('button', { name: 'My report' }));

      const report = await screen.findByRole('article', { name: 'Doctor report' });
      expect(within(report).getByText('Medicines: 32 of 34 doses taken (94%). Missed furosemide on 3 and 6 Oct (patient: going out).')).toBeTruthy();
      expect(within(report).getByText('94%')).toBeTruthy();
      expect(within(report).getByText('6 of 7')).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Print or save as PDF' })).toBeTruthy();
    });
  });

  describe('sign-up and set-up', () => {
    it('creates an account, then walks through set-up to Home', async () => {
      const user = userEvent.setup();
      const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
      render(
        <QueryClientProvider client={qc}>
          <MemoryRouter initialEntries={['/login']}>
            <App />
          </MemoryRouter>
        </QueryClientProvider>,
      );

      await user.click(await screen.findByRole('link', { name: 'Create an account' }));
      await user.type(screen.getByLabelText('Your name'), 'Mr Lee');
      await user.type(screen.getByLabelText('Phone number'), '9123 4567');
      await user.type(screen.getByLabelText('Choose a 4-digit PIN'), '2468');
      await user.type(screen.getByLabelText('Type the PIN again'), '2468');
      await user.click(screen.getByRole('checkbox'));
      await user.click(screen.getByRole('button', { name: 'Create account' }));

      expect(await screen.findByRole('heading', { name: 'Make it easy to read' })).toBeTruthy();
      await user.click(screen.getByRole('button', { name: /Extra large/ }));
      await user.click(screen.getByRole('button', { name: 'Next' }));

      expect(await screen.findByRole('heading', { name: "Patient's numbers" })).toBeTruthy();
      await user.type(screen.getByLabelText('Age'), '68');
      await user.type(screen.getByLabelText('Dry weight'), '70');
      await user.clear(screen.getByLabelText('Drink limit per day'));
      await user.type(screen.getByLabelText('Drink limit per day'), '1200');
      expect(screen.getByText('"Call the nurse if you gain 2 kg or more in 3 days."')).toBeTruthy();
      await user.click(screen.getByRole('button', { name: 'Save and next' }));

      expect(await screen.findByRole('heading', { name: 'Medicines' })).toBeTruthy();
      await user.click(screen.getByRole('button', { name: /Water pill/ }));
      expect(screen.getByRole('group', { name: 'Water pill times' })).toBeTruthy();
      await user.click(screen.getByRole('button', { name: 'Save and next' }));

      expect(await screen.findByRole('heading', { name: 'How much does your cap hold?' })).toBeTruthy();
      await user.click(screen.getByRole('radio', { name: '200 ml' }));
      await user.click(screen.getByRole('button', { name: 'Save cap size' }));

      expect(await screen.findByRole('heading', { name: 'Who should we tell?' })).toBeTruthy();
      await user.type(screen.getByLabelText("Family member's name"), 'Lee Wei');
      await user.type(screen.getByLabelText('They are my…'), 'son');
      await user.click(screen.getByRole('button', { name: 'Finish set-up' }));

      expect(await screen.findByRole('heading', { level: 1, name: /, Mdm Tan$/ })).toBeTruthy();
    });
  });
});
