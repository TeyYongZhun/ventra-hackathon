import { describe, it, expect } from 'vitest';
import { evaluateZone } from '../src/rules';

describe('evaluateZone', () => {
  it('returns green when weight gain is under 2 kg', () => {
    expect(evaluateZone(1.9, 3)).toBe('green');
  });

  it('returns yellow when weight gain is >= 2 kg within 3 days', () => {
    expect(evaluateZone(2.0, 3)).toBe('yellow');
    expect(evaluateZone(3.0, 2)).toBe('yellow');
  });
});
