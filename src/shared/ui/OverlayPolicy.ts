/**
 * What may be on screen, per moment of the story, so layers don't pile up:
 * - story: captions and, if useful, a discreet HUD;
 * - science: one explanatory diagram, captions, no HUD or call to action;
 * - climax: the image first, captions only;
 * - end: one closing question, nothing else.
 */
export type OverlayMode = 'story' | 'science' | 'climax' | 'end';

export type OverlayRules = {captions: boolean; hud: boolean; diagram: boolean; cta: boolean};

export const OVERLAY_RULES: Record<OverlayMode, OverlayRules> = {
  story: {captions: true, hud: true, diagram: false, cta: false},
  science: {captions: true, hud: false, diagram: true, cta: false},
  climax: {captions: true, hud: false, diagram: false, cta: false},
  end: {captions: false, hud: false, diagram: false, cta: true},
};

/** [from, mode] in seconds, sorted; the first entry should start at 0. */
export type OverlayPlan = [number, OverlayMode][];

export const overlayModeAt = (plan: OverlayPlan, t: number): OverlayMode => {
  let mode: OverlayMode = plan[0]?.[1] ?? 'story';
  for (const [from, m] of plan) if (t >= from) mode = m;
  return mode;
};

/** 0..1 visibility of a layer, faded over `fade` seconds around mode changes. */
export const layerAlpha = (plan: OverlayPlan, t: number, layer: keyof OverlayRules, fade = 0.25) => {
  const on = (x: number) => (OVERLAY_RULES[overlayModeAt(plan, x)][layer] ? 1 : 0);
  const change = plan.map(([from]) => from).find((from) => from > 0 && Math.abs(from - t) < fade);
  if (change === undefined) return on(t);
  const k = (t - (change - fade)) / (2 * fade);
  return on(change - 1e-3) * (1 - k) + on(change) * k;
};
