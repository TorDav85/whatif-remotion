/** Director camera: shots shared by the city editor (preview) and Remotion (render). */
export type V3 = [number, number, number];
export type View = {pos: V3; target: V3; fov: number};
export type ShotPath = 'ligne' | 'orbite';
export type ShotEase = 'doux' | 'lineaire' | 'entree' | 'sortie';
export type ShotTransition = 'coupe' | 'fondu';
export type Shot = {
  id: string;
  name: string;
  duration: number;
  from: View;
  to: View;
  path: ShotPath;
  ease: ShotEase;
  /** how this shot starts: hard cut, or a short dip to black */
  transition?: ShotTransition;
  /** hand-held camera shake, 0 (tripod) to 1 (nervous) */
  shake?: number;
};
export type CameraPlan = {shots: Shot[]};
export type Sample = View & {index: number; local: number; fade: number};

export const MIN_SHOT = 0.1;
export const FADE = 0.35;

const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const lerpV = (a: V3, b: V3, k: number): V3 => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
const clamp01 = (k: number) => Math.min(1, Math.max(0, k));
const len = (s: Shot) => Math.max(MIN_SHOT, s.duration);

export const easeK = (k: number, mode: ShotEase) => {
  switch (mode) {
    case 'lineaire': return k;
    case 'entree': return k * k * k;
    case 'sortie': return 1 - Math.pow(1 - k, 3);
    default: return k * k * (3 - 2 * k);
  }
};

export const shotsDuration = (shots: Shot[]) => shots.reduce((s, x) => s + len(x), 0);

/** Start time of each shot, in seconds. */
export const shotStarts = (shots: Shot[]) => {
  const out: number[] = [];
  let t = 0;
  for (const s of shots) {
    out.push(t);
    t += len(s);
  }
  return out;
};

/** Camera of one shot at normalised progress k (0..1), before shake. */
export const viewAt = (s: Shot, k: number): View => {
  const e = easeK(clamp01(k), s.ease);
  const target = lerpV(s.from.target, s.to.target, e);
  const fov = lerp(s.from.fov, s.to.fov, e);
  if (s.path !== 'orbite') return {pos: lerpV(s.from.pos, s.to.pos, e), target, fov};
  const polar = (v: View) => {
    const dx = v.pos[0] - v.target[0];
    const dz = v.pos[2] - v.target[2];
    return {a: Math.atan2(dx, dz), r: Math.hypot(dx, dz), h: v.pos[1] - v.target[1]};
  };
  const a = polar(s.from);
  const b = polar(s.to);
  let da = b.a - a.a;
  if (da > Math.PI) da -= Math.PI * 2;
  if (da < -Math.PI) da += Math.PI * 2;
  const ang = a.a + da * e;
  const r = lerp(a.r, b.r, e);
  return {pos: [target[0] + Math.sin(ang) * r, target[1] + lerp(a.h, b.h, e), target[2] + Math.cos(ang) * r], target, fov};
};

/** Smooth, repeatable hand-held motion (no randomness: identical in preview and render). */
const wobble = (t: number, seed: number) =>
  Math.sin(t * 1.7 + seed) * 0.5 + Math.sin(t * 3.1 + seed * 2.3) * 0.3 + Math.sin(t * 7.3 + seed * 0.7) * 0.2;

/** Camera at time t (seconds) along a list of shots, with cuts or dips to black between shots. */
export const sampleShots = (shots: Shot[], t: number): Sample => {
  if (!shots.length) return {pos: [0, 10, 30], target: [0, 0, 0], fov: 50, index: 0, local: 0, fade: 0};
  const starts = shotStarts(shots);
  const total = shotsDuration(shots);
  const time = Math.min(Math.max(0, t), total - 1e-6);
  let index = shots.length - 1;
  while (index > 0 && time < starts[index]) index--;
  const s = shots[index];
  const local = time - starts[index];
  const view = viewAt(s, local / len(s));
  const shake = s.shake ?? 0;
  if (shake > 0) {
    const a = shake * 0.14;
    view.pos = [view.pos[0] + wobble(time, 1) * a, view.pos[1] + wobble(time, 2) * a * 0.7, view.pos[2] + wobble(time, 3) * a];
    view.target = [view.target[0] + wobble(time, 4) * a * 2, view.target[1] + wobble(time, 5) * a * 1.4, view.target[2] + wobble(time, 6) * a * 2];
  }
  // Dip to black: fade in at the start of a "fondu" shot, fade out at the end of the shot before it.
  let fade = 0;
  if (s.transition === 'fondu' && index > 0) fade = Math.max(fade, 1 - clamp01(local / FADE));
  const next = shots[index + 1];
  if (next?.transition === 'fondu') fade = Math.max(fade, 1 - clamp01((len(s) - local) / FADE));
  return {...view, index, local, fade};
};

/** Same shot moved sideways by (dx, dz): camera and target together, so the framing is unchanged. */
export const shiftShot = (s: Shot, dx: number, dz: number): Shot => {
  const move = (v: View): View => ({
    fov: v.fov,
    pos: [v.pos[0] + dx, v.pos[1], v.pos[2] + dz],
    target: [v.target[0] + dx, v.target[1], v.target[2] + dz],
  });
  return {...s, from: move(s.from), to: move(s.to)};
};

/** Points along a shot, for drawing its trajectory. */
export const trajectory = (s: Shot, samples = 24): V3[] => Array.from({length: samples + 1}, (_, i) => viewAt(s, i / samples).pos);

export type PresetContext = {
  /** city centre and size */
  cx: number;
  cz: number;
  size: number;
  /** subject: position, height, radius, and the unit direction its front faces (camera side) */
  focus: {x: number; z: number; h: number; r: number; dx?: number; dz?: number; /** centre → front face distance */ fd?: number};
  /** a street running along z, near the focus */
  street: {x: number; z: number};
};

export type Preset = {key: string; label: string; hint: string; make: (c: PresetContext) => Omit<Shot, 'id'>};

const v = (pos: V3, target: V3, fov = 50): View => ({pos, target, fov});

/** Point in front of the subject: `dist` metres along its facing, `side` metres to its right, at height y. */
const front = (f: PresetContext['focus'], dist: number, y: number, side = 0): V3 => {
  const dx = f.dx ?? 0;
  const dz = f.dz ?? 1;
  return [f.x + dx * dist - dz * side, y, f.z + dz * dist + dx * side];
};
const at = (f: PresetContext['focus'], y: number): V3 => [f.x, y, f.z];
const shot = (s: Omit<Shot, 'id' | 'transition' | 'shake'> & Partial<Pick<Shot, 'transition' | 'shake'>>): Omit<Shot, 'id'> => ({transition: 'coupe', shake: 0, ...s});

/** The director's vocabulary, framed for vertical 9:16 video. */
export const PRESETS: Preset[] = [
  {key: 'ensemble', label: "Vue d'ensemble 3/4", hint: 'Plan large d’installation, léger zoom avant', make: ({cx, cz, size}) => shot({
    name: "Vue d'ensemble", duration: 4, path: 'ligne', ease: 'doux',
    from: v([cx + size * 0.8, size * 0.6, cz + size * 0.95], [cx, 0, cz], 50),
    to: v([cx + size * 0.68, size * 0.5, cz + size * 0.8], [cx, 0, cz], 48)})},
  {key: 'orbite', label: 'Drone en orbite', hint: 'Tourne autour du sujet, révèle le quartier', make: ({focus, size}) => shot({
    name: 'Orbite', duration: 6, path: 'orbite', ease: 'doux',
    from: v([focus.x + size * 0.5, size * 0.35, focus.z + size * 0.5], [focus.x, focus.h * 0.3, focus.z], 50),
    to: v([focus.x - size * 0.55, size * 0.3, focus.z + size * 0.45], [focus.x, focus.h * 0.3, focus.z], 50)})},
  {key: 'plongee', label: 'Plongée zénithale', hint: 'Vue de dessus, la ville comme une carte', make: ({cx, cz, size}) => shot({
    name: 'Plongée', duration: 4, path: 'ligne', ease: 'doux',
    from: v([cx, size * 1.3, cz + size * 0.12], [cx, 0, cz], 50),
    to: v([cx, size * 0.95, cz + size * 0.09], [cx, 0, cz], 50)})},
  {key: 'travelling', label: 'Travelling de rue', hint: 'Caméra à hauteur de voiture, avance dans la rue', make: ({street}) => shot({
    name: 'Travelling', duration: 5, path: 'ligne', ease: 'lineaire',
    from: v([street.x - 1.6, 1.8, street.z + 30], [street.x - 1, 3, street.z - 20], 60),
    to: v([street.x - 1.6, 1.8, street.z - 10], [street.x - 1, 3, street.z - 60], 60)})},
  {key: 'suivi', label: 'Travelling latéral', hint: 'Glisse le long de la façade du sujet, depuis la chaussée', make: ({focus}) => {
    // From the middle of the street in front of the subject, looking straight at its facade.
    const fd = focus.fd ?? focus.r;
    const d = fd + 9;
    return shot({name: 'Travelling latéral', duration: 5, path: 'ligne', ease: 'lineaire',
      from: v(front(focus, d, 2.2, -12), front(focus, fd, 3.5, -12), 55),
      to: v(front(focus, d, 2.2, 12), front(focus, fd, 3.5, 12), 55)});
  }},
  {key: 'grue', label: 'Grue montante', hint: 'Part de la rue et s’élève au-dessus des toits', make: ({focus}) => shot({
    name: 'Grue', duration: 5, path: 'ligne', ease: 'doux',
    from: v(front(focus, focus.r + 9, 2), at(focus, focus.h * 0.5), 55),
    to: v(front(focus, focus.r + 34, focus.h + 30), at(focus, focus.h * 0.4), 50)})},
  {key: 'tilt', label: 'Tilt vertical', hint: 'Caméra fixe qui lève les yeux du pied au sommet', make: ({focus}) => {
    const pos = front(focus, focus.r + 8 + focus.h * 0.3, 1.6, 2);
    return shot({name: 'Tilt', duration: 4, path: 'ligne', ease: 'doux',
      from: v(pos, at(focus, 1.5), 55), to: v(pos, at(focus, focus.h * 0.95), 55)});
  }},
  {key: 'panoramique', label: 'Panoramique', hint: 'Caméra fixe qui balaie l’horizon de gauche à droite', make: ({focus, size}) => {
    // Above the rooftops, so the fixed camera never sits inside the opposite block.
    const pos = front(focus, size * 0.45, 42);
    return shot({name: 'Panoramique', duration: 5, path: 'ligne', ease: 'doux',
      from: v(pos, front(focus, -size * 0.2, 6, -size * 0.6), 52), to: v(pos, front(focus, -size * 0.2, 6, size * 0.6), 52)});
  }},
  {key: 'pieton', label: 'Regard piéton', hint: 'À hauteur d’yeux, lente approche du sujet', make: ({focus}) => shot({
    name: 'Piéton', duration: 4, path: 'ligne', ease: 'doux',
    // Eyes on the facade (not the shop window): aim at a third of its height.
    from: v(front(focus, focus.r + 14, 1.65, 2), at(focus, Math.min(focus.h * 0.35, 12)), 58),
    to: v(front(focus, focus.r + 9, 1.65, 1.5), at(focus, Math.min(focus.h * 0.4, 13)), 56)})},
  {key: 'epaule', label: 'Caméra épaule', hint: 'Plan tenu à la main, légèrement tremblé : urgence, reportage', make: ({focus}) => shot({
    name: 'Épaule', duration: 4, path: 'ligne', ease: 'lineaire', shake: 0.6,
    from: v(front(focus, focus.r + 12, 1.6, 3), at(focus, Math.min(focus.h * 0.3, 9)), 60),
    to: v(front(focus, focus.r + 8, 1.6, 2), at(focus, Math.min(focus.h * 0.3, 9)), 60)})},
  {key: 'contre', label: 'Contre-plongée', hint: 'Caméra basse qui regarde vers le haut : grandeur, menace', make: ({focus}) => {
    // From the roadway, 7 m out: so low a camera looks over the street-tree crowns (planted ~2 m from
    // the facade, ~4.5 m wide) instead of sitting inside them.
    const fd = focus.fd ?? focus.r;
    return shot({name: 'Contre-plongée', duration: 4, path: 'ligne', ease: 'doux',
      from: v(front(focus, fd + 7.5, 0.6, 1.5), at(focus, focus.h * 0.9), 60),
      to: v(front(focus, fd + 7.0, 0.5, 1.0), at(focus, focus.h), 64)});
  }},
  {key: 'vertigo', label: 'Effet Vertigo', hint: 'Avance en élargissant le champ : le sujet reste, le décor se déforme', make: ({focus}) => {
    // Keep the subject the same size: distance × tan(fov/2) stays constant.
    const d0 = focus.r + 24;
    const d1 = focus.r + 7;
    const f0 = 24;
    const f1 = (2 * Math.atan((Math.tan((f0 * Math.PI) / 360) * d0) / d1) * 180) / Math.PI;
    const y = Math.min(focus.h, 6) * 0.6;
    return shot({name: 'Vertigo', duration: 4, path: 'ligne', ease: 'doux',
      from: v(front(focus, d0, y), at(focus, y), f0),
      to: v(front(focus, d1, y), at(focus, y), Math.round(f1))});
  }},
  {key: 'reveal', label: 'Révélation', hint: 'Démarre serré, recule pour dévoiler le décor', make: ({focus, size}) => shot({
    name: 'Révélation', duration: 5, path: 'ligne', ease: 'doux',
    from: v(front(focus, focus.r + 3, focus.h * 0.6 + 1, 1), at(focus, focus.h * 0.6), 45),
    to: v(front(focus, size * 0.55, size * 0.45, size * 0.35), at(focus, 0), 52)})},
  {key: 'survol', label: 'Survol rasant', hint: 'Vol au-dessus des toits, vitesse et énergie', make: ({cx, cz, size}) => shot({
    name: 'Survol', duration: 5, path: 'ligne', ease: 'lineaire',
    from: v([cx - size * 0.1, 52, cz + size * 0.75], [cx, 14, cz + size * 0.05], 58),
    to: v([cx + size * 0.1, 46, cz - size * 0.15], [cx, 8, cz - size * 0.85], 58)})},
];
