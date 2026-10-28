/** Shared monotone temperature curve and caption timings for Remotion and audio export. */
export function temperatureTimeline(config) {
  const keys = config.curve;
  const n = keys.length;
  const slopes = keys.slice(0, -1).map((key, i) => (keys[i + 1].c - key.c) / (keys[i + 1].t - key.t));
  const tangents = keys.map((_, i) => i === 0 ? slopes[0] : i === n - 1 ? slopes[n - 2] : slopes[i - 1] * slopes[i] <= 0 ? 0 : (slopes[i - 1] + slopes[i]) / 2);
  for (let i = 0; i < n - 1; i++) {
    if (slopes[i] === 0) {tangents[i] = tangents[i + 1] = 0; continue;}
    const a = tangents[i] / slopes[i];
    const b = tangents[i + 1] / slopes[i];
    const s = a * a + b * b;
    if (s > 9) {
      const k = 3 / Math.sqrt(s);
      tangents[i] = k * a * slopes[i];
      tangents[i + 1] = k * b * slopes[i];
    }
  }
  const tempAt = (time) => {
    if (time <= keys[0].t) return keys[0].c;
    if (time >= keys[n - 1].t) return keys[n - 1].c;
    let i = 0;
    while (i < n - 2 && time > keys[i + 1].t) i++;
    const h = keys[i + 1].t - keys[i].t;
    const s = (time - keys[i].t) / h;
    const s2 = s * s;
    const s3 = s2 * s;
    return (2 * s3 - 3 * s2 + 1) * keys[i].c + (s3 - 2 * s2 + s) * h * tangents[i]
      + (-2 * s3 + 3 * s2) * keys[i + 1].c + (s3 - s2) * h * tangents[i + 1];
  };
  const timeAtTemp = (temperature) => {
    if (temperature <= keys[0].c) return 0;
    let lo = 0;
    let hi = config.duration;
    if (tempAt(hi) < temperature - 1e-6) return Infinity;
    for (let k = 0; k < 50; k++) {
      const mid = (lo + hi) / 2;
      if (tempAt(mid) >= temperature - 1e-6) hi = mid;
      else lo = mid;
    }
    return hi;
  };
  const cross = config.beats.map((beat) => timeAtTemp(beat.atC));
  const captions = [];
  let previous = -Infinity;
  config.beats.forEach((beat, i) => {
    if (!beat.caption) return;
    const start = Math.max(cross[i], previous + config.captionMinSec);
    previous = start;
    captions.push({i, start, end: 0, text: beat.caption});
  });
  captions.forEach((caption, i) => {
    const next = captions[i + 1]?.start ?? config.outro.t;
    caption.end = Math.min(next, caption.start + config.captionMaxSec, config.outro.t);
  });
  return {tempAt, timeAtTemp, cross, captions};
}
