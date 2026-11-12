let ctx: AudioContext | null = null;
export function prime() {
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx ??= new AC(); if (ctx.state === 'suspended') void ctx.resume();
  } catch { /* none */ }
}
function tone(freq: number, at: number, len: number, vol: number) {
  if (!ctx) return;
  const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = freq;
  const t0 = ctx.currentTime + at;
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t0 + len);
  o.connect(g).connect(ctx.destination); o.start(t0); o.stop(t0 + len + 0.05);
}
export function playRestEnd() { prime(); tone(660, 0, 0.5, 0.4); tone(880, 0.3, 0.6, 0.4); tone(1320, 0.6, 0.8, 0.4); }
