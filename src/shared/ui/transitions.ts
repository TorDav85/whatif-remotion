/**
 * Cut types: a hard cut for an action that continues, a dip to black only for a real
 * change of period or scale. Since 1.12 also three in-camera transitions on the same canvas
 * (adapted from papercut-explainer's whip and zoomThrough, MIT — see scripts/audio/sfx/THIRD_PARTY.md):
 * - 'whip'  : whip pan, a short horizontal smear on both sides of the cut — switching subject, "meanwhile";
 * - 'zoom'  : the outgoing shot rushes into a point (x, y in px of the 1080 × 1920 frame), the incoming one settles — going inside;
 * - 'flash' : a white flash on the cut — a shock, a detonation, a revelation.
 */
export type CutKind = 'cut' | 'dip' | 'whip' | 'zoom' | 'flash';
export type Cut = {at: number; kind: CutKind; x?: number; y?: number};

/** Black opacity at time t: 0 on hard cuts, a short dip (±half seconds) on 'dip' cuts. */
export const dipAt = (cuts: Cut[], t: number, half = 0.16) =>
  Math.max(0, ...cuts.filter((c) => c.kind === 'dip').map((c) => 1 - Math.min(1, Math.abs(t - c.at) / half)));

/** Seconds of each transition before and after its cut (7 and 8 frames at 30 fps, as in the original). */
export const CUT_SPAN: Record<CutKind, [number, number]> = {cut: [0, 0], dip: [0.16, 0.16], whip: [0.12, 0.12], zoom: [0.2, 0.17], flash: [0, 0.3]};
/** Sound effect to place on each kind of cut (names of scripts/audio/sfx/library.mjs). */
export const CUT_SFX: Partial<Record<CutKind, string>> = {whip: 'whip', zoom: 'zoom', flash: 'hit'};

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const easeInOut = (k: number) => k * k * (3 - 2 * k);

export type CutLook = {
  /** CSS transform of the filmed layer (translate in px, scale around `origin`) */
  transform: string;
  origin: string;
  /** horizontal and isotropic blur, px */
  smear: number;
  blur: number;
  /** white flash over the image, 0..1 */
  flash: number;
};
const NONE: CutLook = {transform: 'none', origin: '50% 50%', smear: 0, blur: 0, flash: 0};

/**
 * How the filmed layer looks at time t around the nearest transition. Pure: the same t always gives
 * the same image (no clock), like the camera.
 */
export const cutLookAt = (cuts: Cut[], t: number, width = 1080, height = 1920): CutLook => {
  const c = cuts.find((cut) => {
    const [before, after] = CUT_SPAN[cut.kind];
    return (before || after) && cut.kind !== 'dip' && t >= cut.at - before && t < cut.at + after;
  });
  if (!c) return NONE;
  const [before, after] = CUT_SPAN[c.kind];
  const outgoing = t < c.at;
  // 0 at the edge of the transition, 1 on the cut itself.
  const k = outgoing ? clamp01((t - (c.at - before)) / before) : clamp01(1 - (t - c.at) / after);
  if (c.kind === 'whip') {
    // The image slides left and smears; a slight zoom keeps the edges filled.
    const e = easeInOut(k);
    // Shift ≤ half the extra width of the zoom (0.12 / 2), so no edge ever shows.
    const shift = (outgoing ? -1 : 1) * e * width * 0.055;
    return {transform: `translateX(${shift.toFixed(1)}px) scale(${(1 + 0.12 * e).toFixed(3)})`, origin: '50% 50%', smear: 60 * Math.pow(e, 0.75), blur: 0, flash: 0};
  }
  if (c.kind === 'zoom') {
    const x = c.x ?? width / 2;
    const y = c.y ?? height / 2;
    if (outgoing) {
      // Exponential push into (x, y), which glides towards the centre while the shot swells and blurs.
      const e = Math.pow(k, 1.5);
      const s = Math.exp(Math.log(5) * e);
      return {transform: `translate(${((width / 2 - x) * e).toFixed(1)}px, ${((height / 2 - y) * e).toFixed(1)}px) scale(${s.toFixed(3)})`,
        origin: `${x}px ${y}px`, smear: 0, blur: 2 + 20 * Math.pow(e, 1.2), flash: 0.25 * e};
    }
    return {transform: `scale(${(1 + 0.15 * easeInOut(k)).toFixed(3)})`, origin: '50% 50%', smear: 0, blur: 16 * k, flash: 0.22 * Math.sin(Math.PI * clamp01(k))};
  }
  // flash: full white on the cut, fading out.
  return {...NONE, flash: Math.pow(k, 1.6)};
};

/** Cue sheet entries for the cuts' sound effects ({t, sfx}), for `npm run sfx`. */
export const cutCues = (cuts: Cut[]) => cuts.filter((c) => CUT_SFX[c.kind])
  .map((c) => ({t: Math.max(0, c.at - (c.kind === 'flash' ? 0 : CUT_SPAN[c.kind][0])), sfx: CUT_SFX[c.kind] as string}));
