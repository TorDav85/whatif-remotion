import React from 'react';
import {AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {smooth} from '../../core/animation';
import voice from './voice.json';
import {Scene3D, CUTS, BRIGHT, STOP, DAYS, dryAt} from './Scene3D';
import {Hud} from './Hud';
import {TextOverlay, EndCard} from './TextOverlay';

export const MarcSoif: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const t = frame / fps;
  const dip = Math.max(0, ...CUTS.map((c) => 1 - Math.min(1, Math.abs(t - c) / 0.12)));
  const dry = dryAt(t);
  // The stop: the picture drains of colour and goes black, then the light comes back for the facts.
  const out = smooth(61.8, STOP, t) * (1 - smooth(BRIGHT, BRIGHT + 0.6, t));
  // Day 5 fever: the picture swims a little.
  const fever = smooth(DAYS[4], 60, t) * (t < BRIGHT ? 1 : 0);

  return (
    <AbsoluteFill style={{background: '#000'}}>
      <AbsoluteFill style={{
        filter: `saturate(${(1 + 0.35 * dry) * (1 - out)}) sepia(${0.25 * dry}) contrast(${1 + 0.1 * dry}) blur(${fever * 1.5 * (1 + Math.sin(t * 2.3))}px)`,
      }}>
        <ThreeCanvas width={width} height={height} linear={false} gl={{antialias: true}}>
          <Scene3D t={t} />
        </ThreeCanvas>
      </AbsoluteFill>
      {/* Heat vignette that grows with the days */}
      <AbsoluteFill style={{background: `radial-gradient(ellipse at center, rgba(0,0,0,0) 45%, rgba(120,30,10,${0.55 * dry}) 100%)`, pointerEvents: 'none'}} />
      <AbsoluteFill style={{background: '#000', opacity: Math.max(dip, out), pointerEvents: 'none'}} />
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
