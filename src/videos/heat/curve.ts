import {temperatureTimeline} from '../../core/temperature.mjs';
import tl from './timeline.json';
import * as THREE from 'three';
import {fmtInt} from '../../core/physics';

export const H = tl;
export const FPS = tl.fps;
export const DURATION_FRAMES = Math.round(tl.duration * tl.fps);

const timing = temperatureTimeline(tl);
export const tempAt = timing.tempAt;
export const timeAtTemp = timing.timeAtTemp;
export const slopeAt = (t: number) => (tempAt(t + 0.01) - tempAt(t - 0.01)) / 0.02;
export const elapsedMin = (c: number) => (c - tl.startC) / tl.rateCPerMin;
export const timelapseAt = (t: number) => (slopeAt(t) / tl.rateCPerMin) * 60;
export type Beat = {atC: number; state: string; caption?: string; voice?: string};
export const BEATS = tl.beats as Beat[];
export const CROSS = timing.cross;
export const CAPTIONS = timing.captions;

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
