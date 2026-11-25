// Chakri geometry: segment angles are 360 x probability with no visual minimum.
export type Seg = { prizeId: string; pct: number };

export function segments(layout: Seg[]) {
  let a = 0;
  return layout.map((s) => {
    const span = (s.pct / 100) * 360;
    const seg = { ...s, start: a, end: a + span };
    a += span;
    return seg;
  });
}

/** Deterministic 0..1 from a play id, so the same play always lands the same way. */
export function seeded(id: string) {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  return ((h >>> 0) % 10000) / 10000;
}

/**
 * Angle (degrees, clockwise) the wheel must rotate so the pointer at 12 o'clock rests inside the
 * target segment, offset within +/-35 percent of its half-width and at least 1 degree from an edge.
 */
export function computeStopAngle(layout: Seg[], prizeId: string, seed: number) {
  const segs = segments(layout);
  const s = segs.find((x) => x.prizeId === prizeId) ?? segs[0];
  const half = (s.end - s.start) / 2;
  const mid = s.start + half;
  const off = Math.max(-half + 1, Math.min(half - 1, (seed * 2 - 1) * half * 0.35));
  const at = mid + off;
  return (360 - at) % 360;
}
