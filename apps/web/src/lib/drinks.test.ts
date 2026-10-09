import { describe, expect, it } from 'vitest';
import { capOptions, drinkState } from './drinks';

describe('capOptions', () => {
  it('sizes the four buttons to the patient cap', () => {
    expect(capOptions(150).map((cap) => [cap.label, cap.ml])).toEqual([
      ['¼ cap', 38],
      ['½ cap', 75],
      ['¾ cap', 113],
      ['Full cap', 150],
    ]);
  });

  it('gives no buttons until the cap size is set', () => {
    expect(capOptions(0)).toEqual([]);
  });
});

describe('drinkState', () => {
  it('shows what is left and fills the bottle', () => {
    expect(drinkState(850, 1500)).toMatchObject({ limitSet: true, left: 650, near: false, over: false });
    expect(drinkState(750, 1500).percent).toBe(50);
  });

  it('warns from 80% of the limit', () => {
    expect(drinkState(1199, 1500).near).toBe(false);
    expect(drinkState(1200, 1500)).toMatchObject({ near: true, over: false });
  });

  it('caps the bottle at the limit line once over', () => {
    expect(drinkState(1750, 1500)).toMatchObject({ left: 0, percent: 100, near: false, over: true });
  });

  it('handles a patient with no limit set', () => {
    expect(drinkState(300, 0)).toEqual({ limitSet: false, left: 0, percent: 0, near: false, over: false });
  });
});
