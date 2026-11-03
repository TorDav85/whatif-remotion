/**
 * Cut types: a hard cut for an action that continues, a dip to black only for a real
 * change of period or scale.
 */
export type Cut = {at: number; kind: 'cut' | 'dip'};

/** Black opacity at time t: 0 on hard cuts, a short dip (±half seconds) on 'dip' cuts. */
export const dipAt = (cuts: Cut[], t: number, half = 0.16) =>
  Math.max(0, ...cuts.filter((c) => c.kind === 'dip').map((c) => 1 - Math.min(1, Math.abs(t - c.at) / half)));
