import { describe, expect, it } from 'vitest';
import { MAX_STRENGTH, strength } from './strength';

const day = (d: number, h = 18) => new Date(2026, 9, d, h).getTime();
const now = (d: number) => new Date(2026, 9, d, 12);

describe('strength', () => {
  it('is 0 with no workouts', () => expect(strength([], now(15))).toBe(0));
  it('adds 1 per workout day, capped at max', () => {
    expect(strength([day(1), day(2), day(3)], now(4))).toBe(3);
    expect(strength([1, 2, 3, 4, 5, 6].map((d) => day(d)), now(7))).toBe(MAX_STRENGTH);
  });
  it('counts two workouts on one day once', () => expect(strength([day(1, 8), day(1, 20)], now(2))).toBe(1));
  it('one rest day between workouts is free', () => expect(strength([day(1), day(3), day(5)], now(6))).toBe(3));
  it('loses 1 from the 2nd rest day in a row', () => {
    // 4 workouts, then rest on 5,6,7 (today 8): 6 and 7 cost 1 each
    expect(strength([1, 2, 3, 4].map((d) => day(d)), now(8))).toBe(2);
  });
  it('does not count today as missed', () => expect(strength([1, 2, 3, 4].map((d) => day(d)), now(6))).toBe(MAX_STRENGTH));
  it('never goes below 0', () => expect(strength([day(1)], now(20))).toBe(0));
  it('a workout today counts', () => expect(strength([day(1), day(2), day(3, 9)], now(3))).toBe(3));
});
