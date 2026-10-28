import React from 'react';
import {AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {smooth} from '../world';
import {City} from './City';
import {Globe} from './Globe';
import {GravityCaptions, GravityEndCard, GravityHud, GravitySteps} from './GravityUi';
import {DURATION_FRAMES, FPS, G, landTau, tauAt} from './time';

/** Chaque séquence 3D : les plans de ville partagent la même scène, seule la caméra change. */
const SCENES: Record<string, React.FC<{from: number}>> = {
  quays: ({from}) => <City from={from} shot="quays" />,
  champ: ({from}) => <City from={from} shot="champ" />,
  river: ({from}) => <City from={from} shot="river" />,
  up: ({from}) => <City from={from} shot="up" />,
  fall: ({from}) => <City from={from} shot="fall" />,
  earth: Globe,
};

export const Gravity: React.FC = () => {
  const frame = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const t = frame / FPS;
  const tau = tauAt(t);
  // petit flash blanc au moment où la gravité revient
  const land = landTau();
  const thud = tau > land ? Math.exp(-(tau - land) * 4) : 0;

  return (
    <AbsoluteFill style={{background: '#000'}}>
      {G.scenes.map((s) => {
        const Scene = SCENES[s.id];
        if (!Scene) return null;
        const a = Math.min(s.from === 0 ? 1 : smooth(s.from, s.from + G.fadeSec, t), 1 - smooth(s.to - G.fadeSec, s.to, t));
        return (
          <Sequence key={s.id} from={Math.round(s.from * FPS)} durationInFrames={Math.round((s.to - s.from) * FPS)}>
            <AbsoluteFill style={{opacity: a}}>
              <ThreeCanvas width={width} height={height} camera={{fov: 60, position: [0, 0, 5]}}>
                <Scene from={s.from} />
              </ThreeCanvas>
            </AbsoluteFill>
          </Sequence>
        );
      })}

      <AbsoluteFill style={{background: '#fff', opacity: 0.35 * thud, pointerEvents: 'none'}} />
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(0,0,0,0.4) 100%)', pointerEvents: 'none'}} />
      <GravityHud />
      <GravityCaptions />
      <GravitySteps />

      {G.scenes
        .filter((s) => s.id === 'end')
        .map((s) => (
          <Sequence key="end" from={Math.round(s.from * FPS)} durationInFrames={Math.round((s.to - s.from) * FPS)}>
            <GravityEndCard from={s.from} />
          </Sequence>
        ))}

      {G.audio.music ? (
        <Audio
          src={staticFile(G.audio.music)}
          volume={(f) => interpolate(f, [0, 30, DURATION_FRAMES - 60, DURATION_FRAMES], [0, 0.9, 0.9, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}
        />
      ) : null}
    </AbsoluteFill>
  );
};
