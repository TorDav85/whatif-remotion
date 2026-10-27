import tl from './timeline.json';
import * as THREE from 'three';
import {fmtInt} from '../physics';

export const H = tl;
export const FPS = tl.fps;
export const DURATION_FRAMES = Math.round(tl.duration * tl.fps);

// ---------- Courbe temps vidéo → température ----------
// Spline cubique monotone (Fritsch–Carlson) : passe par chaque keyframe, ne redescend jamais,
// et sa dérivée est continue (le facteur de time-lapse ne saute pas).
const K = tl.curve;
const tangents = (() => {
  const n = K.length;
  const d = K.slice(0, -1).map((k, i) => (K[i + 1].c - k.c) / (K[i + 1].t - k.t));
  const m = K.map((_, i) => (i === 0 ? d[0] : i === n - 1 ? d[n - 2] : d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2));
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) {
      m[i] = m[i + 1] = 0;
      continue;
    }
    const a = m[i] / d[i];
    const b = m[i + 1] / d[i];
    const s = a * a + b * b;
    if (s > 9) {
      const k = 3 / Math.sqrt(s);
      m[i] = k * a * d[i];
      m[i + 1] = k * b * d[i];
    }
  }
  return m;
})();

const seg = (t: number) => {
  let i = 0;
  while (i < K.length - 2 && t > K[i + 1].t) i++;
  return i;
};

/** Température (°C) à l'instant vidéo t (s). */
export const tempAt = (t: number): number => {
  if (t <= K[0].t) return K[0].c;
  if (t >= K[K.length - 1].t) return K[K.length - 1].c;
  const i = seg(t);
  const h = K[i + 1].t - K[i].t;
  const s = (t - K[i].t) / h;
  const s2 = s * s;
  const s3 = s2 * s;
  return (
    (2 * s3 - 3 * s2 + 1) * K[i].c + (s3 - 2 * s2 + s) * h * tangents[i] + (-2 * s3 + 3 * s2) * K[i + 1].c + (s3 - s2) * h * tangents[i + 1]
  );
};

/** Pente (°C par seconde de vidéo). */
export const slopeAt = (t: number) => (tempAt(t + 0.01) - tempAt(t - 0.01)) / 0.02;

/** Premier instant où la courbe atteint c (recherche dichotomique, la courbe est monotone). */
export const timeAtTemp = (c: number): number => {
  if (c <= K[0].c) return 0;
  let lo = 0;
  let hi = tl.duration;
  if (tempAt(hi) < c - 1e-6) return Infinity;
  for (let k = 0; k < 50; k++) {
    const mid = (lo + hi) / 2;
    if (tempAt(mid) >= c - 1e-6) hi = mid;
    else lo = mid;
  }
  return hi;
};

/** Minutes réelles écoulées : (T − 22) / 10. */
export const elapsedMin = (c: number) => (c - tl.startC) / tl.rateCPerMin;
/** Secondes réelles par seconde de vidéo. */
export const timelapseAt = (t: number) => (slopeAt(t) / tl.rateCPerMin) * 60;

// ---------- Beats déclenchés par seuils de température ----------
export type Beat = {atC: number; state: string; caption?: string};
export const BEATS = tl.beats as Beat[];

/** Instant où chaque seuil est franchi (calculé, pas écrit à la main). */
export const CROSS = BEATS.map((b) => timeAtTemp(b.atC));

/**
 * Créneaux des sous-titres : un sous-titre démarre quand son seuil est franchi,
 * sauf si le précédent n'a pas encore eu `captionMinSec` à l'écran (lisibilité) — il attend alors.
 */
export const CAPTIONS = (() => {
  const out: {i: number; start: number; end: number; text: string}[] = [];
  let prev = -Infinity;
  BEATS.forEach((b, i) => {
    if (!b.caption) return;
    const start = Math.max(CROSS[i], prev + tl.captionMinSec);
    prev = start;
    out.push({i, start, end: 0, text: b.caption});
  });
  out.forEach((c, k) => {
    const next = out[k + 1]?.start ?? tl.outro.t;
    c.end = Math.min(next, c.start + tl.captionMaxSec, tl.outro.t);
  });
  return out;
})();

export const stateAt = (c: number) => {
  let s = BEATS[0].state;
  for (const b of BEATS) if (c >= b.atC - 1e-6) s = b.state;
  return s;
};

// ---------- Étalonnage piloté par la température ----------
type GradeKey = (typeof tl.grade)[number];
const G = tl.grade;
const gIndex = (c: number) => {
  if (c <= G[0].c) return [0, 0, 0] as const;
  for (let i = 0; i < G.length - 1; i++)
    if (c <= G[i + 1].c) {
      const f = (c - G[i].c) / (G[i + 1].c - G[i].c);
      return [i, i + 1, f * f * (3 - 2 * f)] as const;
    }
  return [G.length - 1, G.length - 1, 0] as const;
};
export const gradeColor = (c: number, field: keyof GradeKey) => {
  const [a, b, f] = gIndex(c);
  return new THREE.Color(G[a][field] as string).lerp(new THREE.Color(G[b][field] as string), f);
};
export const gradeNum = (c: number, field: keyof GradeKey) => {
  const [a, b, f] = gIndex(c);
  return (G[a][field] as number) + ((G[b][field] as number) - (G[a][field] as number)) * f;
};

/** Couleur de la jauge : blanc → jaune → orange → rouge. */
export const thermoColor = (c: number) => {
  const stops: [number, string][] = [[22, '#ffffff'], [90, '#ffe14d'], [300, '#ff9a1f'], [700, '#ff3b1f'], [1100, '#ff1a0a']];
  for (let i = 0; i < stops.length - 1; i++)
    if (c <= stops[i + 1][0]) {
      const f = Math.max(0, (c - stops[i][0]) / (stops[i + 1][0] - stops[i][0]));
      return '#' + new THREE.Color(stops[i][1]).lerp(new THREE.Color(stops[i + 1][1]), f).getHexString();
    }
  return stops[stops.length - 1][1];
};

// ---------- Formats ----------
export const fmtTemp = (c: number) => fmtInt(c);
export const fmtElapsed = (min: number) => {
  const m = Math.max(0, Math.round(min));
  if (m < 60) return `${m} MIN`;
  return `${Math.floor(m / 60)} H ${String(m % 60).padStart(2, '0')} MIN`;
};
/** Horloge de la caméra de surveillance : heure de départ + temps réel écoulé. */
export const fmtClock = (min: number) => {
  const [h, mm, ss] = tl.clockStart.split(':').map(Number);
  const total = Math.floor(h * 3600 + mm * 60 + ss + min * 60);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(Math.floor(total / 3600) % 24)}:${p(Math.floor(total / 60) % 60)}:${p(total % 60)}`;
};

/** Découpe « texte {mot-clé} texte » en morceaux. */
export const splitKeyword = (s: string) =>
  s.split(/(\{[^}]+\})/).filter(Boolean).map((p) => (p.startsWith('{') ? {k: true, s: p.slice(1, -1)} : {k: false, s: p}));
