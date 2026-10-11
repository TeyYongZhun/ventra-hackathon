import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from '../App';
import { loginAsDemo } from '../test-utils';

// jsdom can't decode or draw photos: hand back a ready JPEG.
vi.mock('../lib/photo', () => ({ photoToJpeg: vi.fn(async () => 'data:image/jpeg;base64,/9j/AAAA') }));

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
    it("shows today's salt against the limit, without the food list", async () => {
      await openTrackTab(/Scan meal/);
      const salt = await screen.findByRole('region', { name: "Today's salt" });
      expect(within(salt).getByText('400')).toBeTruthy();
      expect(within(salt).getByText('1,600 of 2,000 mg eaten')).toBeTruthy();
      expect(within(salt).getByRole('img', { name: 'Bowl of salt, 80 percent of the way to the limit line' })).toBeTruthy();
      expect(screen.queryByRole('heading', { name: 'What did you eat?' })).toBeNull();
    });

    it("shows today's meals as cards that open and close, with a visual and a detailed view", async () => {
      const user = await openTrackTab(/Scan meal/);
      const log = await screen.findByRole('region', { name: "Today's food log" });
      const card = within(log).getByRole('button', { name: /Lunch · 12:40 PM.*Fish soup with noodles.*High salt · 1,100 mg/ });
      expect(card.getAttribute('aria-expanded')).toBe('false');
      expect(within(log).queryByText('In this meal')).toBeNull();

      await user.click(card);
      expect(card.getAttribute('aria-expanded')).toBe('true');
      expect(within(log).getByText('High in salt — about ½ teaspoon')).toBeTruthy();
      expect(within(log).getByText('About 420 calories')).toBeTruthy();
      expect(within(log).getByText('Carbs · ½ plate')).toBeTruthy();

      await user.click(within(log).getByRole('button', { name: 'Detailed' }));
      expect(within(log).getByText('Potassium')).toBeTruthy();
      expect(within(log).getByText('650 mg')).toBeTruthy();

      await user.click(card);
      expect(card.getAttribute('aria-expanded')).toBe('false');
      expect(within(log).queryByText('In this meal')).toBeNull();
    });

    // The mock API keeps meals between tests: this removes one, and the scan below adds one.
    it('undoes the latest meal', async () => {
      const user = await openTrackTab(/Scan meal/);
      const log = await screen.findByRole('region', { name: "Today's food log" });
      expect(within(log).getByText('Fish soup with noodles')).toBeTruthy();

      await user.click(within(log).getByRole('button', { name: 'Undo last' }));
      expect(await screen.findByText('Last meal removed.')).toBeTruthy();
      expect(within(log).queryByText('Fish soup with noodles')).toBeNull();
      expect(within(log).getByText('Oat porridge with banana')).toBeTruthy();
    });

    it('checks a meal photo with the patient before logging it, and keeps the photo', async () => {
      const user = await openTrackTab(/Scan meal/);
      const scan = await screen.findByRole('region', { name: 'Scan my meal' });
      expect(within(scan).getByText("Take a photo before you eat. We'll tell you how salty it is.")).toBeTruthy();

      await user.upload(within(scan).getByLabelText('Meal photo'), new File(['photo'], 'lunch.jpg', { type: 'image/jpeg' }));
      const result = await screen.findByRole('region', { name: 'Your meal photo' });
      expect(within(result).getByRole('heading', { name: 'Chicken rice' })).toBeTruthy();
      expect(within(result).getByRole('img', { name: 'Your photo of Chicken rice' })).toBeTruthy();
      expect(within(result).getByText('High in salt — about ½ teaspoon')).toBeTruthy();
      expect(within(result).getByText(/That is 65% of your day./)).toBeTruthy();
      // Not logged yet.
      const log = screen.getByRole('region', { name: "Today's food log" });
      expect(within(log).queryByText('Chicken rice')).toBeNull();

      await user.click(within(result).getByRole('button', { name: 'Yes, log it' }));
      expect(await screen.findByText('Chicken rice logged.')).toBeTruthy();
      expect(screen.queryByRole('region', { name: 'Your meal photo' })).toBeNull();
      // The new meal opens on its card, photo first.
      expect(within(log).getByRole('img', { name: 'Your photo of Chicken rice' }).getAttribute('src')).toBe('data:image/jpeg;base64,/9j/AAAA');
      expect(within(log).getByText('Estimated from your photo')).toBeTruthy();
    });
  });

  describe('weight', () => {
    it("shows today's weight, the changes, the chart and the targets", async () => {
      await openTrackTab(/Log weight/);
      const today = await screen.findByRole('region', { name: "Today's weight" });
      expect(within(today).getByText('Steady — all good')).toBeTruthy();
      expect(within(today).getByText('Today at 7:10 AM')).toBeTruthy();
      // Demo patient only: placeholder until the Bluetooth scale is built.
      expect(screen.getByText('Scale connected')).toBeTruthy();
      // Since yesterday (58.2 → 58.4) and over 3 days (58.2 → 58.4) are both +0.2 kg.
      expect(screen.getAllByText('+0.2 kg')).toHaveLength(2);
      expect(screen.getByRole('img', { name: /^Weight from .* to Wed, 7 October \(58\.4 kg\)$/ })).toBeTruthy();
      const targets = screen.getByRole('region', { name: 'My targets' });
      expect(targets.textContent).toContain('If you gain more than 2 kg in 3 days.');
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

    it('warns about a big jump and asks before saving it', async () => {
      const user = await openTrackTab(/Log weight/);
      await user.click(await screen.findByRole('link', { name: 'Type my weight' }));
      for (const key of ['6', '1']) await user.click(await screen.findByRole('button', { name: key }));
      expect(screen.getByRole('alert').textContent).toContain('2 kg or more away from yesterday');

      // Save asks first; "Fix the number" clears the box.
      await user.click(screen.getByRole('button', { name: 'Save my weight' }));
      const ask = screen.getByRole('group', { name: 'Is 61.0 kg right?' });
      expect(ask.textContent).toContain("That's 2.8 kg more than yesterday (58.2 kg).");
      await user.click(within(ask).getByRole('button', { name: 'Fix the number' }));
      expect(screen.queryByRole('group', { name: /kg right\?/ })).toBeNull();
      expect(screen.getByRole('button', { name: 'Type your weight first' })).toBeTruthy();

      // Typing it again and saying yes saves it.
      for (const key of ['6', '1']) await user.click(screen.getByRole('button', { name: key }));
      await user.click(screen.getByRole('button', { name: 'Save my weight' }));
      await user.click(within(screen.getByRole('group', { name: 'Is 61.0 kg right?' })).getByRole('button', { name: 'Yes, save it' }));
      expect(await screen.findByRole('heading', { level: 1, name: 'Track' })).toBeTruthy();
    });
  });

  describe('report', () => {
    it('shows the doctor report with the same numbers as the app', async () => {
      const user = await loginAsDemo();
      await user.click(screen.getByRole('button', { name: 'My report' }));

      // Summary screen first (design/Report.dc.html), then the full A4 report.
      expect(await screen.findByText('Your report is ready')).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Download PDF' })).toBeTruthy();
      await user.click(screen.getByRole('link', { name: 'Open the full report' }));

      const report = await screen.findByRole('article', { name: 'Doctor report' });
      expect(within(report).getByText('Medicines: 32 of 34 doses taken (94%). Missed furosemide on 3 and 6 Oct (patient: going out).')).toBeTruthy();
      expect(within(report).getByText('94%')).toBeTruthy();
      expect(within(report).getByText('6 of 7')).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Download PDF' })).toBeTruthy();
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
