import React from 'react';
import {AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {smooth} from '../world';
import {CAPTIONS, DURATION_FRAMES, FPS, H, gradeColor, gradeNum, tempAt} from './curve';
import {Captions, CctvOverlay, Hud, Outro, Title} from './HeatUi';
import {SCENES} from './scenes';

/** Habillage CSS propre à certaines séquences (caméra de surveillance, gros plan flou). */
const FILTERS: Record<string, string> = {
  cctv: 'saturate(0.72) contrast(1.12) brightness(1.03)',
  metal: 'blur(1.6px) saturate(1.15)',
};

export const Heat: React.FC = () => {
  const frame = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const t = frame / FPS;
  const c = tempAt(t);
  const tint = gradeColor(c, 'tint');
  const cctv = H.scenes.find((s) => s.id === 'cctv')!;

  return (
    <AbsoluteFill style={{background: '#000'}}>
      {H.scenes.map((s) => {
        const Scene = SCENES[s.id];
        if (!Scene) return null;
        const first = s.from === 0;
        const last = s.to >= H.duration;
        const a = Math.min(first ? 1 : smooth(s.from, s.from + H.fadeSec, t), last ? 1 : 1 - smooth(s.to - H.fadeSec, s.to, t));
        return (
          <Sequence key={s.id} from={Math.round(s.from * FPS)} durationInFrames={Math.round((s.to - s.from) * FPS)}>
            <AbsoluteFill style={{opacity: a, filter: FILTERS[s.id]}}>
              <ThreeCanvas width={width} height={height} camera={{fov: 60, position: [0, 0, 5]}}>
                <Scene from={s.from} />
              </ThreeCanvas>
            </AbsoluteFill>
          </Sequence>
        );
      })}

      {/* étalonnage global piloté par la température */}
      <AbsoluteFill style={{background: `#${tint.getHexString()}`, opacity: gradeNum(c, 'tintA'), mixBlendMode: 'soft-light', pointerEvents: 'none'}} />
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(0,0,0,0.42) 100%)', pointerEvents: 'none'}} />

      <CctvOverlay from={cctv.from} to={cctv.to} />
      <Title />
      <Hud />
      <Captions />
      <Outro />

      {H.audio.music ? (
        <Audio
          src={staticFile(H.audio.music)}
          volume={(f) => interpolate(f, [0, 30, DURATION_FRAMES - 45, DURATION_FRAMES], [0, 0.9, 0.9, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}
        />
      ) : null}
      {/* voix off : un fichier par beat, lancé à l'ouverture de son sous-titre (= seuil franchi) */}
      {H.audio.voice
        ? CAPTIONS.map((cap) => (
            <Sequence key={cap.i} from={Math.round(cap.start * FPS)}>
              <Audio src={staticFile(`${H.audio.voiceDir}/beat-${cap.i}.wav`)} />
            </Sequence>
          ))
        : null}
    </AbsoluteFill>
  );
};
