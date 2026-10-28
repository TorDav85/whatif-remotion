import tl from './nature.json';
import {sampleNum, smooth} from '../../core/animation';
import {fmtInt} from '../../core/physics';

export const N = tl;
export const FPS = tl.fps;
export const DURATION_FRAMES = Math.round(tl.duration * tl.fps);

export const world = (t: number, field: string) => sampleNum(tl.world as any, t, field);

/** Temps vidéo (s) → jours sans humains. Interpolé en échelle log : le compteur s'emballe puis se pose sur chaque palier. */
export const elapsedDays = (t: number) => {
  const keys = tl.days.map((k) => ({t: k.t, L: Math.log10(1 + k.d)}));
  return Math.pow(10, sampleNum(keys as any, t, 'L')) - 1;
};

export const elapsedYears = (t: number) => elapsedDays(t) / 365.25;

export const fmtElapsed = (d: number) => {
  if (d < 1.5) {
    const h = Math.max(1, Math.round(d * 24));
    return h === 1 ? '1 heure' : `${fmtInt(h)} heures`;
  }
  if (d < 60) return `${fmtInt(d)} jours`;
  if (d < 340) return `${fmtInt(d / 30.44)} mois`;
  const y = Math.round(d / 365.25);
  return y <= 1 ? '1 an' : `${fmtInt(y)} ans`;
};

const sampleV = (keys: {t: number; v: number}[], t: number) => sampleNum(keys as any, t, 'v');

/** Pluie (0..1) et éclairs : la pluie accompagne « les toits cèdent ». */
export const rainAt = (t: number) => sampleV(tl.rain, t);
export const flashAt = (t: number) =>
  tl.thunder.reduce((m, t0) => (t < t0 ? m : Math.max(m, Math.exp(-(t - t0) * 9) * (t - t0 < 0.12 ? 1 : 0.55))), 0);

/** Caméra : spline de Catmull-Rom sur les clés (mouvement continu, sans arrêt sur chaque clé). */
export const camAt = (t: number) => {
  const k = tl.camera;
  const f = ['x', 'y', 'z', 'tx', 'ty', 'tz'] as const;
  if (t <= k[0].t) return f.map((n) => k[0][n]);
  if (t >= k[k.length - 1].t) return f.map((n) => k[k.length - 1][n]);
  let i = 0;
  while (t > k[i + 1].t) i++;
  const u = (t - k[i].t) / (k[i + 1].t - k[i].t);
  const p = (j: number) => k[Math.max(0, Math.min(k.length - 1, j))];
  return f.map((n) => {
    const [a, b, c, d] = [p(i - 1)[n], p(i)[n], p(i + 1)[n], p(i + 2)[n]];
    return 0.5 * (2 * b + (c - a) * u + (2 * a - 5 * b + 4 * c - d) * u * u + (3 * b - a - 3 * c + d) * u * u * u);
  });
};

/**
 * Saisons en time-lapse. La phase suit le vrai calendrier tant que le temps passe lentement,
 * puis plafonne à `maxRate` an/s : les années défilent, les saisons clignotent sans stroboscope.
 */
export const seasonAt = (t: number) => {
  const s = tl.seasons;
  const dt = 1 / tl.fps;
  let phase = 0;
  for (let x = 0; x < t; x += dt) phase += Math.min(elapsedYears(Math.min(t, x + dt)) - elapsedYears(x), s.maxRate * dt);
  const f = phase - Math.floor(phase); // 0 = printemps (le jour de la disparition)
  const amp = s.amp * smooth(s.from, s.from + 1, t) * (1 - smooth(s.to - 2, s.to, t));
  return {
    autumn: amp * smooth(0.36, 0.48, f) * (1 - smooth(0.6, 0.68, f)),
    winter: amp * smooth(0.62, 0.7, f) * (1 - smooth(0.86, 0.96, f)),
  };
};

/** Hauteur du soleil (composante y de sa direction) : haut le jour, au ras de l'horizon au crépuscule. */
export const sunElevAt = (t: number) => sampleV(tl.sunElev, t);

/** Distance parcourue par un mobile de vitesse 1 : il roule jusqu'à la disparition, puis freine jusqu'à l'arrêt. */
export const driveTime = (t: number, brakeSec: number) => {
  if (t <= tl.vanish) return t;
  const u = Math.min(1, (t - tl.vanish) / brakeSec);
  return tl.vanish + brakeSec * (u - (u * u) / 2);
};
