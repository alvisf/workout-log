import { describe, expect, it } from 'vitest';
import { doneDays } from './done';

const w = (id: string, plannedDayId: string | null, endedAt: number | null, programId = 'p') =>
  ({ id, programId, plannedDayId, endedAt }) as never;

describe('doneDays', () => {
  it('maps each finished program day to its latest end time', () => {
    const m = doneDays('p', [w('a', 'd1', 100), w('b', 'd1', 300), w('c', 'd2', 200)], []);
    expect(m.get('d1')).toBe(300);
    expect(m.get('d2')).toBe(200);
  });
  it('skips open workouts, other programs and unplanned ones', () => {
    const m = doneDays('p', [w('a', 'd1', null), w('b', 'd2', 5, 'other'), w('c', null, 5)], []);
    expect(m.size).toBe(0);
  });
  it('includes days ticked in the current week with no time', () => {
    const m = doneDays('p', [], ['d9']);
    expect(m.has('d9')).toBe(true);
    expect(m.get('d9')).toBeNull();
  });
});
