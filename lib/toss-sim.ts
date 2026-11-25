// Gullak Toss: one deterministic simulation shared by the client (to draw) and the server (to judge).
// The server re-runs this on the raw throws and ignores any score the client claims.
export type Throw = { t: number; vx: number; vy: number };

export const TOSS = { period: 1600, amp: 70, height: 260, slot: 30, window: 10500, gap: 350, max: 3 };

export function gullakX(tMs: number, phase: number) {
  return TOSS.amp * Math.sin((2 * Math.PI * tMs) / TOSS.period + phase);
}

/** Where a throw ends up and whether it drops in the slot. */
export function judgeThrow(th: Throw, phase: number) {
  if (!(th.vy > 200) || !Number.isFinite(th.vx)) return { hit: false, at: th.t, x: 0 };
  const flight = (TOSS.height / th.vy) * 1000;
  const x = (th.vx * flight) / 1000;
  const at = th.t + flight;
  const hit = Math.abs(x - gullakX(at, phase)) <= TOSS.slot;
  return { hit, at, x };
}

export function tossHits(throws: Throw[], phase: number): number {
  let hits = 0;
  let last = -Infinity;
  const sorted = [...throws].sort((a, b) => a.t - b.t).slice(0, TOSS.max);
  for (const th of sorted) {
    const tooSoon = th.t - last < TOSS.gap;
    last = th.t;
    if (tooSoon || th.t < 0 || th.t > TOSS.window) continue;
    if (judgeThrow(th, phase).hit) hits++;
  }
  return hits;
}

export const tierCapFor = (hits: number) => (hits >= 3 ? 3 : hits >= 1 ? 2 : 1);
