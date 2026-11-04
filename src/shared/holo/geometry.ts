/**
 * Pure maths of the holo style (no React, no WebGL state): cables, lightning, pulses.
 * Everything is a function of its inputs, so a frame always renders the same.
 */
import {clamp01, rng} from '../../core/animation';

export type V3 = [number, number, number];

const lerp3 = (a: V3, b: V3, k: number): V3 => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];

/**
 * Hanging cable between two anchors: `n + 1` points, ends exact, lowest by `sag` metres at mid-span
 * (parabola, indistinguishable from a catenary at these sags).
 */
export const catenary = (a: V3, b: V3, sag: number, n = 48): V3[] =>
  Array.from({length: n + 1}, (_, i) => {
    const k = i / n;
    const p = lerp3(a, b, k);
    p[1] -= 4 * sag * k * (1 - k);
    return p;
  });

/**
 * Lightning between two points: midpoint displacement, perpendicular to the segment, reproducible from
 * `seed`. `depth` halvings give 2^depth + 1 points; the ends are exactly `a` and `b`.
 */
export const arcPoints = (a: V3, b: V3, seed: number, depth = 5, roughness = 0.32): V3[] => {
  const r = rng(seed);
  let pts: V3[] = [a, b];
  let amp = roughness * Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  for (let d = 0; d < depth; d++) {
    const next: V3[] = [pts[0]];
    for (let i = 0; i < pts.length - 1; i++) {
      const m = lerp3(pts[i], pts[i + 1], 0.5);
      next.push([m[0] + (r() - 0.5) * amp, m[1] + (r() - 0.5) * amp, m[2] + (r() - 0.5) * amp], pts[i + 1]);
    }
    pts = next;
    amp *= 0.55;
  }
  return pts;
};

/** Seed of an arc that flickers: a new shape every `hold` frames. */
export const flickerSeed = (base: number, frame: number, hold = 2) => base * 9973 + Math.floor(frame / hold);

/**
 * Brightness (0..1) of travelling pulses at position u (0..1 along a path) and time t.
 * `count` pulses on the path, moving `speed` path-lengths per second; `width` is the lit share of a period.
 */
export const pulseAt = (u: number, t: number, count: number, speed: number, width = 0.22) => {
  const d = (((u * count - t * speed * count) % 1) + 1) % 1;
  return clamp01(1 - Math.abs(d - width / 2) / (width / 2));
};

/** Radius of the `i`-th ground ring of a radar wave started at `t0` (null before it starts or once faded). */
export const ringRadius = (t: number, t0: number, i: number, speed: number, spacing: number, life: number) => {
  const age = t - t0 - i * (spacing / speed);
  return age < 0 || age > life ? null : age * speed;
};

/** Point and unit tangent along a polyline at u (0..1, by length). */
export const along = (pts: V3[], u: number): {p: V3; dir: V3} => {
  const seg: number[] = [];
  let total = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const l = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1], pts[i + 1][2] - pts[i][2]);
    seg.push(l);
    total += l;
  }
  let s = clamp01(u) * total;
  for (let i = 0; i < seg.length; i++) {
    if (s <= seg[i] || i === seg.length - 1) {
      const k = seg[i] ? Math.min(1, s / seg[i]) : 0;
      const a = pts[i];
      const b = pts[i + 1];
      const l = seg[i] || 1;
      return {p: lerp3(a, b, k), dir: [(b[0] - a[0]) / l, (b[1] - a[1]) / l, (b[2] - a[2]) / l]};
    }
    s -= seg[i];
  }
  return {p: pts[pts.length - 1], dir: [1, 0, 0]};
};
