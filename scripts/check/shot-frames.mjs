/** Middle frame of every saved director shot of a city layout. */
export const shotFrames = (layout, fps) => {
  const shots = layout?.camera?.shots ?? [];
  const frames = [];
  let t = 0;
  for (const s of shots) {
    const d = Math.max(0.1, s.duration);
    frames.push({frame: Math.round((t + d / 2) * fps), label: s.name});
    t += d;
  }
  return frames;
};
