import {VoiceTrack} from '../../shared/audio/VoiceTrack';
import React from 'react';
import {AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {Park} from './scenes/Park';
import {Earth} from './scenes/Earth';
import {Scale} from './scenes/Scale';
import {Hud, BEATS} from './ui/Hud';
import {Captions} from './ui/Captions';
import {EndCard} from './ui/EndCard';
import {DURATION_FRAMES, FPS, T, sampleNum} from './world';

const SCENES: Record<string, React.FC<{from: number}>> = {park: Park, earth: Earth, scale: Scale};

export const WhatIf: React.FC = () => {
  const frame = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const t = frame / FPS;
  const flash = sampleNum(T.flash as any, t, 'a');

  return (
    <AbsoluteFill style={{background: '#000'}}>
      {T.scenes
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
      {/* flash blanc (couleur crème comme la référence) */}
      <AbsoluteFill style={{background: '#f5f0e6', opacity: flash, pointerEvents: 'none'}} />

      <Hud />
      <Captions />

      {T.scenes
        .filter((s) => s.id === 'end')
        .map((s) => (
          <Sequence key="end" from={Math.round(s.from * FPS)} durationInFrames={Math.round((s.to - s.from) * FPS)}>
            <EndCard from={s.from} />
          </Sequence>
        ))}

      {/* Son */}
      {T.audio.music ? (
        <Audio
          src={staticFile(T.audio.music)}
          volume={(f) => interpolate(f, [0, 30, DURATION_FRAMES - 60, DURATION_FRAMES], [0, 0.9, 0.9, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}
        />
      ) : null}
      <VoiceTrack audio={T.audio} beats={BEATS} />
    </AbsoluteFill>
  );
};
