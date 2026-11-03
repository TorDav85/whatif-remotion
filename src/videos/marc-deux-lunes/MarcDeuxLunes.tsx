import React from 'react';
import {AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import voice from './voice.json';
import {Scene3D, CUTS, APPEAR, CRASH, eclipseDark} from './Scene3D';
import {Hud} from './Hud';
import {TextOverlay, EndCard} from './TextOverlay';

export const MarcDeuxLunes: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const t = frame / fps;
  const dip = Math.max(0, ...CUTS.map((c) => 1 - Math.min(1, Math.abs(t - c) / 0.12)));
  // The sky darkens during each eclipse.
  const dark = eclipseDark(t);
  // Soft glow when the second moon appears, white flash at the crash.
  const appear = Math.max(0, 1 - Math.abs(t - APPEAR - 0.2) / 0.4);
  const flash = Math.max(0, 1 - Math.abs(t - CRASH) / 0.25);

  return (
    <AbsoluteFill style={{background: '#000'}}>
      <AbsoluteFill style={{filter: `brightness(${1 - 0.55 * dark}) saturate(${1 - 0.4 * dark})`}}>
        <ThreeCanvas width={width} height={height} linear={false} gl={{antialias: true}}>
          <Scene3D t={t} />
        </ThreeCanvas>
      </AbsoluteFill>
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 20%, rgba(200,220,255,0.5) 0%, rgba(200,220,255,0) 60%)', opacity: appear, pointerEvents: 'none'}} />
      <AbsoluteFill style={{background: '#fff4e0', opacity: flash * 0.8, pointerEvents: 'none'}} />
      <AbsoluteFill style={{background: '#000', opacity: dip, pointerEvents: 'none'}} />
      <Hud t={t} />
      <TextOverlay t={t} />
      <EndCard t={t} />
      <Audio src={staticFile(voice.ambience)} volume={0.9} />
      {voice.beats.map((b) => (
        <Sequence key={b.id} from={Math.round(b.start * fps)} durationInFrames={Math.ceil(b.duration * fps) + 2}>
          <Audio src={staticFile(b.audio)} volume={1} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
