/** Director camera: shots shared by the city editor (preview) and Remotion (render). */
export type V3 = [number, number, number];
export type View = {pos: V3; target: V3; fov: number};
export type ShotPath = 'ligne' | 'orbite';
export type Shot = {id: string; name: string; duration: number; from: View; to: View; path: ShotPath; ease: 'doux' | 'lineaire'};
export type CameraPlan = {shots: Shot[]};

const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const lerpV = (a: V3, b: V3, k: number): V3 => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
const ease = (k: number, mode: Shot['ease']) => (mode === 'lineaire' ? k : k * k * (3 - 2 * k));

export const shotsDuration = (shots: Shot[]) => shots.reduce((s, x) => s + Math.max(0.1, x.duration), 0);

/** Camera at time t (seconds) along a list of shots, with hard cuts between shots. */
export const sampleShots = (shots: Shot[], t: number): View & {index: number} => {
  let start = 0;
  let index = shots.length - 1;
  for (let i = 0; i < shots.length; i++) {
    if (t < start + Math.max(0.1, shots[i].duration)) {
      index = i;
      break;
    }
    start += Math.max(0.1, shots[i].duration);
  }
  if (index === shots.length - 1 && t >= start + shots[index].duration) start = shotsDuration(shots) - shots[index].duration;
  const s = shots[index];
  const k = ease(Math.min(1, Math.max(0, (t - start) / Math.max(0.1, s.duration))), s.ease);
  const target = lerpV(s.from.target, s.to.target, k);
  const fov = lerp(s.from.fov, s.to.fov, k);
  if (s.path === 'orbite') {
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
    const ang = a.a + da * k;
    const r = lerp(a.r, b.r, k);
    return {pos: [target[0] + Math.sin(ang) * r, target[1] + lerp(a.h, b.h, k), target[2] + Math.cos(ang) * r], target, fov, index};
  }
  return {pos: lerpV(s.from.pos, s.to.pos, k), target, fov, index};
};

export type PresetContext = {
  /** city centre and size */
  cx: number;
  cz: number;
  size: number;
  /** selected object (falls back to the centre) */
  focus: {x: number; z: number; h: number; r: number};
  /** a street running along z, near the focus */
  street: {x: number; z: number};
};

export type Preset = {key: string; label: string; hint: string; make: (c: PresetContext) => Omit<Shot, 'id'>};

const v = (pos: V3, target: V3, fov = 50): View => ({pos, target, fov});

/** The director's vocabulary, framed for vertical 9:16 video. */
export const PRESETS: Preset[] = [
  {key: 'ensemble', label: "Vue d'ensemble 3/4", hint: 'Plan large d’installation, léger zoom avant', make: ({cx, cz, size}) => ({
    name: "Vue d'ensemble", duration: 4, path: 'ligne', ease: 'doux',
    from: v([cx + size * 0.8, size * 0.6, cz + size * 0.95], [cx, 0, cz], 50),
    to: v([cx + size * 0.68, size * 0.5, cz + size * 0.8], [cx, 0, cz], 48)})},
  {key: 'orbite', label: 'Drone en orbite', hint: 'Tourne autour du sujet, révèle le quartier', make: ({focus, size}) => ({
    name: 'Orbite', duration: 6, path: 'orbite', ease: 'doux',
    from: v([focus.x + size * 0.5, size * 0.35, focus.z + size * 0.5], [focus.x, focus.h * 0.3, focus.z], 50),
    to: v([focus.x - size * 0.55, size * 0.3, focus.z + size * 0.45], [focus.x, focus.h * 0.3, focus.z], 50)})},
  {key: 'plongee', label: 'Plongée zénithale', hint: 'Vue de dessus, la ville comme une carte', make: ({cx, cz, size}) => ({
    name: 'Plongée', duration: 4, path: 'ligne', ease: 'doux',
    from: v([cx, size * 1.3, cz + size * 0.12], [cx, 0, cz], 50),
    to: v([cx, size * 0.95, cz + size * 0.09], [cx, 0, cz], 50)})},
  {key: 'travelling', label: 'Travelling de rue', hint: 'Caméra à hauteur de voiture, avance dans la rue', make: ({street}) => ({
    name: 'Travelling', duration: 5, path: 'ligne', ease: 'lineaire',
    from: v([street.x - 1.6, 1.8, street.z + 30], [street.x - 1, 3, street.z - 20], 60),
    to: v([street.x - 1.6, 1.8, street.z - 10], [street.x - 1, 3, street.z - 60], 60)})},
  {key: 'grue', label: 'Grue montante', hint: 'Part de la rue et s’élève au-dessus des toits', make: ({focus, street}) => ({
    name: 'Grue', duration: 5, path: 'ligne', ease: 'doux',
    from: v([street.x, 2, focus.z + focus.r + 14], [focus.x, focus.h * 0.5, focus.z], 55),
    to: v([street.x, focus.h + 30, focus.z + focus.r + 34], [focus.x, focus.h * 0.4, focus.z], 50)})},
  {key: 'pieton', label: 'Regard piéton', hint: 'À hauteur d’yeux, lente approche du sujet', make: ({focus}) => ({
    name: 'Piéton', duration: 4, path: 'ligne', ease: 'doux',
    from: v([focus.x + 2, 1.65, focus.z + focus.r + 12], [focus.x, Math.min(focus.h, 4) * 0.7, focus.z], 58),
    to: v([focus.x + 1.5, 1.65, focus.z + focus.r + 7], [focus.x, Math.min(focus.h, 4) * 0.7, focus.z], 55)})},
  {key: 'contre', label: 'Contre-plongée', hint: 'Caméra basse qui regarde vers le haut : grandeur, menace', make: ({focus}) => ({
    name: 'Contre-plongée', duration: 4, path: 'ligne', ease: 'doux',
    from: v([focus.x + focus.r * 0.6 + 3, 0.6, focus.z + focus.r + 5], [focus.x, focus.h * 0.9, focus.z], 62),
    to: v([focus.x + focus.r * 0.6 + 2, 0.5, focus.z + focus.r + 3.5], [focus.x, focus.h, focus.z], 66)})},
  {key: 'reveal', label: 'Révélation', hint: 'Démarre serré, recule pour dévoiler le décor', make: ({focus, size}) => ({
    name: 'Révélation', duration: 5, path: 'ligne', ease: 'doux',
    from: v([focus.x + 1, focus.h * 0.6 + 1, focus.z + focus.r + 3], [focus.x, focus.h * 0.6, focus.z], 45),
    to: v([focus.x + size * 0.35, size * 0.45, focus.z + size * 0.55], [focus.x, 0, focus.z], 52)})},
  {key: 'survol', label: 'Survol rasant', hint: 'Vol au-dessus des toits, vitesse et énergie', make: ({cx, cz, size}) => ({
    name: 'Survol', duration: 5, path: 'ligne', ease: 'lineaire',
    from: v([cx - size * 0.1, 52, cz + size * 0.75], [cx, 14, cz + size * 0.05], 58),
    to: v([cx + size * 0.1, 46, cz - size * 0.15], [cx, 8, cz - size * 0.85], 58)})},
];
