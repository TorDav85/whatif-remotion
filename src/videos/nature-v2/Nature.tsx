import React from 'react';
import {VoiceTrack} from '../../shared/audio/VoiceTrack';
import {AbsoluteFill, Audio, Sequence, interpolate, staticFile, useVideoConfig} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {Paris} from './Paris';
import {NatureCaptions, NatureEndCard, NatureHud} from './NatureUi';
import {DURATION_FRAMES, FPS, N} from './time';

const SCENES: Record<string, React.FC<{from: number}>> = {paris: Paris};

export const NatureV2: React.FC = () => {
  const {width, height} = useVideoConfig();
  return (
    <AbsoluteFill style={{background: '#000'}}>
      {N.scenes
        .filter((s) => SCENES[s.id])
        .map((s) => {
          const Scene = SCENES[s.id];
          return (
            <Sequence key={s.id} from={Math.round(s.from * FPS)} durationInFrames={Math.round((s.to - s.from) * FPS)}>
              <ThreeCanvas width={width} height={height} camera={{fov: 60, position: [0, 0, 5]}}>
                <Scene from={s.from} />
              </ThreeCanvas>
            </Sequence>
          );
        })}

      {/* vignette */}
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(0,0,0,0.38) 100%)', pointerEvents: 'none'}} />

      <NatureHud />
      <NatureCaptions />

      {N.scenes
        .filter((s) => s.id === 'end')
        .map((s) => (
          <Sequence key="end" from={Math.round(s.from * FPS)} durationInFrames={Math.round((s.to - s.from) * FPS)}>
            <NatureEndCard from={s.from} />
          </Sequence>
        ))}

      <VoiceTrack audio={N.audio} beats={N.beats} />
      {N.audio.music ? (
        <Audio
          src={staticFile(N.audio.music)}
          volume={(f) => interpolate(f, [0, 30, DURATION_FRAMES - 60, DURATION_FRAMES], [0, 0.9, 0.9, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}
        />
      ) : null}
    </AbsoluteFill>
  );
};
