import tl from './gravity.json';
import {fmtInt} from '../../core/physics';

export const G = tl;
export const FPS = tl.fps;
export const DURATION_FRAMES = Math.round(tl.duration * tl.fps);

type K = {t: number} & Record<string, number>;

/** Interpolation linéaire (le temps réel doit avancer à vitesse constante entre deux clés). */
export const lin = (keys: K[], t: number, f: string) => {
  if (t <= keys[0].t) return keys[0][f];
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i];
    const b = keys[i + 1];
    if (t <= b.t) return a[f] + ((b[f] - a[f]) * (t - a.t)) / (b.t - a.t);
  }
  return keys[keys.length - 1][f];
};

/** Temps vidéo → secondes réelles depuis 14 h 00 (négatif avant la coupure). */
export const tauAt = (t: number) => lin(tl.tau as K[], t, 'v');

// ---------- Physique ----------
const P = tl.physics;
const lat = (P.latDeg * Math.PI) / 180;
/** Vitesse de Paris autour de l'axe de la Terre (m/s). */
export const SPIN_MS = P.omega * P.earthRadiusM * Math.cos(lat);
/**
 * Sans gravité, un objet posé garde sa vitesse et part en ligne droite, alors que le sol, lui, continue de tourner.
 * L'écart croît comme ½·a·τ², avec a = ω²·R·cos(lat) dirigé à l'opposé de l'axe de la Terre :
 * une part vers le haut (cos lat), une part vers le sud (sin lat).
 */
const A_AXIS = P.omega * P.omega * P.earthRadiusM * Math.cos(lat);
export const A_UP = A_AXIS * Math.cos(lat);
export const A_SOUTH = A_AXIS * Math.sin(lat);

const offT = (tau: number) => Math.max(0, Math.min(P.offSec, tau));

/** Altitude d'un objet (m). `drag` : accélération en plus due à l'air qui monte (objets légers). */
export const liftAt = (tau: number, drag = 0) => {
  const a = A_UP + drag;
  const s = offT(tau);
  const h = 0.5 * a * s * s;
  if (tau <= P.offSec) return h;
  const f = tau - P.offSec; // la gravité revient : chute libre (on néglige la petite vitesse verticale)
  return Math.max(0, h - 0.5 * P.g * f * f);
};
/** Dérive vers le sud (m) : elle s'arrête au moment de l'impact. */
export const driftAt = (tau: number, drag = 0) => {
  const s = offT(tau);
  const d = 0.5 * A_SOUTH * s * s;
  if (tau <= P.offSec) return d;
  const v = A_SOUTH * P.offSec;
  return d + v * Math.min(tau - P.offSec, fallSec(drag));
};
/** Durée de la chute quand la gravité revient (s). */
export const fallSec = (drag = 0) => Math.sqrt((2 * liftAt(P.offSec, drag)) / P.g);
/** Instant (τ) où l'objet touche le sol. */
export const landTau = (drag = 0) => P.offSec + fallSec(drag);
export const impactMS = (drag = 0) => P.g * fallSec(drag);

/** Hauteur de la colonne d'air (m) : accélérée par la pression, plafonnée à la vitesse du son. */
export const plumeAt = (tau: number) => {
  const s = offT(tau);
  const tc = P.soundMS / P.g;
  if (s < tc) return 0.5 * P.g * s * s;
  return 0.5 * P.g * tc * tc + P.soundMS * (s - tc);
};

export const PEOPLE = P.people;
export const LIGHT = P.light;
export const GRAVITY_ON = (tau: number) => tau < 0 || tau >= P.offSec;

// ---------- Formats ----------
const dec = (x: number, n = 1) => x.toFixed(n).replace('.', ',');
export const fmtM = (m: number) => (m < 10 ? `${dec(m)} m` : `${fmtInt(m)} m`);
export const fmtKm = (m: number) => (m < 10000 ? `${dec(m / 1000)} km` : `${fmtInt(m / 1000)} km`);
export const fmtKmh = (ms: number) => `${fmtInt(ms * 3.6)} km/h`;
export const clockAt = (tau: number) => {
  const [h, m, s] = tl.clockStart.split(':').map(Number);
  const tot = Math.floor(h * 3600 + m * 60 + s + tau);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(Math.floor(tot / 3600))}:${p(Math.floor(tot / 60) % 60)}:${p(tot % 60)}`;
};
