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
      // An optional note helps the AI.
      await user.type(within(scan).getByLabelText('Anything we should know? (optional)'), 'chicken rice, half portion');

      await user.upload(within(scan).getByLabelText('Meal photo'), new File(['photo'], 'lunch.jpg', { type: 'image/jpeg' }));
      const result = await screen.findByRole('region', { name: 'Your meal photo' });
      expect(within(result).getByRole('heading', { name: 'Chicken rice' })).toBeTruthy();
      expect(within(result).getByRole('img', { name: 'Your photo of Chicken rice' })).toBeTruthy();
      expect(within(result).getByText('High in salt — about ½ teaspoon')).toBeTruthy();
      expect(within(result).getByText(/That is 65% of your day./)).toBeTruthy();
      // 500 mg eaten so far + 1,300 mg: still under the 2,000 mg limit.
      expect(within(result).queryByText(/over today's salt limit/)).toBeNull();
      // The soup with it goes into today's drinks, and the box says so.
      const drinks = within(result).getByRole('region', { name: 'Added to your drinks' });
      expect(within(drinks).getByText("This meal has about 150 ml of soup. It will be added to today's drinks.")).toBeTruthy();
      expect(within(result).queryByRole('checkbox')).toBeNull();
      // Not logged yet.
      const log = screen.getByRole('region', { name: "Today's food log" });
      expect(within(log).queryByText('Chicken rice')).toBeNull();

      await user.click(within(result).getByRole('button', { name: 'Yes, log it' }));
      expect(await screen.findByText('Chicken rice logged. 150 ml added to your drinks.')).toBeTruthy();
      expect(screen.queryByRole('region', { name: 'Your meal photo' })).toBeNull();
      expect((screen.getByLabelText('Anything we should know? (optional)') as HTMLInputElement).value).toBe('');
      // The new meal opens on its card, photo first.
      expect(within(log).getByRole('img', { name: 'Your photo of Chicken rice' }).getAttribute('src')).toBe('data:image/jpeg;base64,/9j/AAAA');
      expect(within(log).getByText('150 ml added to your drinks')).toBeTruthy();
      expect(within(log).getByText('Estimated from your photo')).toBeTruthy();
    });

    it('checks the same photo again with what the patient says, and warns about salt before and after', async () => {
      const user = await openTrackTab(/Scan meal/);
      const scan = await screen.findByRole('region', { name: 'Scan my meal' });
      await user.upload(within(scan).getByLabelText('Meal photo'), new File(['photo'], 'dinner.jpg', { type: 'image/jpeg' }));
      const first = await screen.findByRole('region', { name: 'Your meal photo' });

      await user.click(within(first).getByRole('button', { name: 'Not right? Tell us what it is' }));
      await user.type(within(first).getByLabelText('What is it?'), 'fish soup with noodles');
      await user.click(within(first).getByRole('button', { name: 'Check again' }));
      expect(await screen.findByRole('heading', { name: 'Fish soup with noodles' })).toBeTruthy();
      const result = screen.getByRole('region', { name: 'Your meal photo' });

      // 1,800 mg eaten so far (porridge and chicken rice) + 1,100 mg.
      expect(within(result).getByText("This meal would take you 900 mg over today's salt limit (2,000 mg).")).toBeTruthy();
      await user.click(within(result).getByRole('button', { name: 'Yes, log it' }));
      expect(await screen.findByText('Fish soup with noodles logged. 150 ml added to your drinks.')).toBeTruthy();

      // Now over: the salt card keeps a warning.
      expect(await screen.findByRole('alert', { name: "You're 900 mg over today's salt limit" })).toBeTruthy();
      expect(screen.getByText(/Your limit is 2,000 mg\. Choose low-salt food for the rest of today/)).toBeTruthy();
    });
  });

  describe('weight', () => {
    it("shows today's weight, the changes, the chart and the targets", async () => {
      await openTrackTab(/Log weight/);
      const today = await screen.findByRole('region', { name: "Today's weight" });
      expect(within(today).getByText('Steady — all good')).toBeTruthy();
      expect(within(today).getByText('Today at 7:10 AM')).toBeTruthy();
      // No Bluetooth scale: weights are typed in.
      expect(screen.queryByText('Scale connected')).toBeNull();
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
      // A way back to log in, at the top and under the form.
      expect(screen.getAllByRole('link', { name: 'Back to log in' }).map((link) => link.getAttribute('href'))).toEqual(['/login', '/login']);
      await user.type(screen.getByLabelText('Your name'), 'Mr Lee');
      await user.type(screen.getByLabelText('Phone number'), '9123 4567');
      await user.type(screen.getByLabelText('Choose a 4-digit PIN'), '1111');

      // Back to log in and in again: the name and phone are kept, the PIN is not.
      await user.click(screen.getAllByRole('link', { name: 'Back to log in' })[0]!);
      await user.click(await screen.findByRole('link', { name: 'Create an account' }));
      expect((screen.getByLabelText('Your name') as HTMLInputElement).value).toBe('Mr Lee');
      expect((screen.getByLabelText('Phone number') as HTMLInputElement).value).toBe('9123 4567');
      expect((screen.getByLabelText('Choose a 4-digit PIN') as HTMLInputElement).value).toBe('');
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
      // Back one step: the numbers typed there are still filled in.
      await user.click(screen.getAllByRole('link', { name: 'Back' })[0]!);
      expect(await screen.findByRole('heading', { name: "Patient's numbers" })).toBeTruthy();
      expect((screen.getByLabelText('Age') as HTMLInputElement).value).toBe('68');
      expect((screen.getByLabelText('Drink limit per day') as HTMLInputElement).value).toBe('1200');
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
      // The phone number is needed, and there is no skipping this step.
      expect(screen.queryByRole('button', { name: 'Skip for now' })).toBeNull();
      expect((screen.getByRole('button', { name: 'Finish set-up' }) as HTMLButtonElement).disabled).toBe(true);
      await user.type(screen.getByLabelText('Their phone number'), '123');
      expect(screen.getByText('A phone number has at least 8 digits.')).toBeTruthy();
      await user.type(screen.getByLabelText('Their phone number'), '4 5678');
      // Each step after the first has a way back.
      // (the round arrow at the top and the Back button under the main one).
      expect(screen.getAllByRole('link', { name: 'Back' }).map((link) => link.getAttribute('href'))).toEqual(['/setup/4', '/setup/4']);
      await user.click(screen.getByRole('button', { name: 'Finish set-up' }));

      expect(await screen.findByRole('heading', { level: 1, name: /, Mdm Tan$/ })).toBeTruthy();
      // Finished: nothing typed is left behind.
      expect(Object.keys(sessionStorage).filter((key) => key.startsWith('ventra.draft.'))).toEqual([]);
    });
  });
});
