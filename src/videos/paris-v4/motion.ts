import {smooth} from '../../core/animation';
import P from './scenario.json';

export const shotOpacity = (t: number, from: number, to: number) =>
  (from === 0 ? 1 : smooth(from, from + 1, t)) * (to === P.duration ? 1 : 1 - smooth(to - 1, to, t));

/** Interpolation douce des points du mouvement de recul. */
export const cameraAt = (t: number) => {
  const keys = P.camera;
  const i = Math.min(keys.length - 2, Math.max(0, keys.findIndex((k, n) => n < keys.length - 1 && t < keys[n + 1].t)));
  if (t >= keys[keys.length - 1].t) return keys[keys.length - 1];
  const a = keys[i];
  const b = keys[i + 1];
  const f = Math.max(0, (t - a.t) / (b.t - a.t));
  // Tangentes partagées : le mouvement ne s'arrête plus à chaque palier.
  const fields = ['x', 'y', 'z', 'tx', 'ty', 'tz'] as const;
  const values = Object.fromEntries(fields.map((field) => {
    const before = keys[Math.max(0, i - 1)];
    const after = keys[Math.min(keys.length - 1, i + 2)];
    const m0 = (b[field] - before[field]) / (b.t - before.t);
    const m1 = (after[field] - a[field]) / (after.t - a.t);
    const h = b.t - a.t;
    const value = (2 * f ** 3 - 3 * f ** 2 + 1) * a[field] + (f ** 3 - 2 * f ** 2 + f) * h * m0
      + (-2 * f ** 3 + 3 * f ** 2) * b[field] + (f ** 3 - f ** 2) * h * m1;
    return [field, value];
  })) as Record<(typeof fields)[number], number>;
  return {t, ...values};
};
