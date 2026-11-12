/** Bell's strength: +1 per workout day (max 4), 1 rest day free, then -1 per extra rest day. Today never counts as missed. */
export const MAX_STRENGTH = 4;

const key = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

export function strength(endedAts: readonly number[], now: Date = new Date()): number {
  if (endedAts.length === 0) return 0;
  const days = new Set(endedAts.map((t) => key(new Date(t))));
  const first = new Date(Math.min(...endedAts));
  const d = new Date(first.getFullYear(), first.getMonth(), first.getDate());
  const todayKey = key(now);
  let s = 0;
  let rest = 0;
  for (let guard = 0; guard < 4000; guard++) {
    const k = key(d);
    if (days.has(k)) { s = Math.min(MAX_STRENGTH, s + 1); rest = 0; }
    else if (k !== todayKey) { rest++; if (rest >= 2) s = Math.max(0, s - 1); }
    if (k === todayKey || d > now) break;
    d.setDate(d.getDate() + 1);
  }
  return s;
}
