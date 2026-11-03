import React from 'react';
import {AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import voice from './voice.json';
import {ThreeCanvas} from '@remotion/three';
import {smooth} from '../../core/animation';
import {Scene3D, CUTS} from './Scene3D';
import {Hud} from './Hud';
import {TextOverlay, EndCard} from './TextOverlay';

// Black glitch bars while the phones die (5-10s).
const Glitch: React.FC<{t: number}> = ({t}) => {
  const k = smooth(5, 6, t) * (1 - smooth(9.5, 10.5, t));
  if (k <= 0) return null;
  const f = Math.floor(t * 30);
  const bars = Array.from({length: 6}, (_, i) => {
    const h = ((f * 7 + i * 13) % 17) / 17;
    return {top: `${((f * 31 + i * 53) % 100)}%`, height: 4 + h * 40, on: (f + i) % 3 === 0};
  });
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      {bars.map((b, i) => b.on && (
        <div key={i} style={{position: 'absolute', left: 0, right: 0, top: b.top, height: b.height, background: 'rgba(0,0,0,0.85)', opacity: k}} />
      ))}
    </AbsoluteFill>
  );
};

export const InternetOff: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const t = frame / fps;
  // Soft dip to black between scenes.
  const dip = Math.max(0, ...CUTS.map((c) => 1 - Math.min(1, Math.abs(t - c) / 0.22)));

  return (
    <AbsoluteFill style={{background: '#000'}}>
      <ThreeCanvas width={width} height={height} linear={false} gl={{antialias: true}}>
        <Scene3D t={t} />
      </ThreeCanvas>
      <AbsoluteFill style={{background: '#000', opacity: dip, pointerEvents: 'none'}} />
      <Glitch t={t} />
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
