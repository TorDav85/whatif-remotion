export const G = 6.6743e-11;
export const C = 299792458;
export const G0 = 9.80665;
export const SUN_MASS = 1.989e30;

/** Rayon de Schwarzschild : r = 2GM/c² */
export const schwarzschildRadius = (m: number) => (2 * G * m) / (C * C);

/** Accélération newtonienne à la distance r (m/s²) */
export const accelAt = (m: number, r: number) => (G * m) / (r * r);

export type FallState = {r: number; v: number; realT: number};

/**
 * Chute libre depuis le repos à r0 (intégration numérique, déterministe).
 * Tout est en temps RÉEL (microsecondes). On convertit ensuite avec le facteur de ralenti.
 */
export const makeFall = (m: number, r0: number, dt = 1e-8, rMin = 0.5) => {
  const rs: number[] = [r0];
  const vs: number[] = [0];
  let r = r0;
  let v = 0;
  let t = 0;
  while (r > rMin && t < 1e-3) {
    v += accelAt(m, r) * dt;
    r -= v * dt;
    t += dt;
    rs.push(r);
    vs.push(v);
  }
  const tEnd = t;
  const at = (realT: number): FallState => {
    const x = Math.max(0, Math.min(realT, tEnd)) / dt;
    const i = Math.min(Math.floor(x), rs.length - 2);
    const f = x - i;
    return {
      r: rs[i] + (rs[i + 1] - rs[i]) * f,
      v: vs[i] + (vs[i + 1] - vs[i]) * f,
      realT,
    };
  };
  return {at, tEnd};
};

// ---------- Formatage français ----------
const NNBSP = '\u202f';
const group = (s: string) => s.replace(/\B(?=(\d{3})+(?!\d))/g, NNBSP);
const dec = (n: number, d: number) => n.toFixed(d).replace('.', ',');
const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹⁻';
const sup = (n: number) =>
  String(n)
    .split('')
    .map((c) => (c === '-' ? SUP[10] : SUP[Number(c)]))
    .join('');

export const fmtInt = (n: number) => group(Math.round(n).toString());

export const fmtSci = (n: number, unit = '') => {
  const exp = Math.floor(Math.log10(Math.abs(n)));
  const mant = n / Math.pow(10, exp);
  return `${dec(mant, 2)} × 10${sup(exp)}${unit ? ' ' + unit : ''}`;
};

export const fmtLength = (m: number) => {
  if (m < 1) return `${dec(m * 100, 1)} cm`;
  if (m < 1000) return `${dec(m, 1)} m`;
  return `${dec(m / 1000, 0)} km`;
};

export const fmtG = (g: number) => {
  if (g >= 1e9) return `${fmtInt(g / 1e9)} milliards de g`;
  if (g >= 1e6) return `${dec(g / 1e6, 0)} millions de g`;
  return `${fmtInt(g)} g`;
};

export const fmtTonnes = (t: number) => {
  if (t >= 2e9) return `${fmtInt(t / 1e9)} milliards de tonnes`;
  if (t >= 1e9) return `${dec(t / 1e9, 1)} milliard de tonnes`;
  if (t >= 1e6) return `${dec(t / 1e6, 1)} million de tonnes`;
  return `${fmtInt(t)} tonnes`;
};

export const fmtMicro = (s: number) => `${dec(s * 1e6, 2)} µs`;
