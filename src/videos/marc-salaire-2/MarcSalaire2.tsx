import React from 'react';
import {AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {smooth} from '../../core/animation';
import voice from './voice.json';
import {Scene3D, CUTS, BLACK, CHAIR, ROOM} from './Scene3D';
import {TextOverlay, EndCard} from './TextOverlay';

export const MarcSalaire2: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const t = frame / fps;
  const dip = Math.max(0, ...CUTS.map((c) => 1 - Math.min(1, Math.abs(t - c) / 0.12)));
  // Opens on the blinding light from the end of part 1.
  const white = 1 - smooth(0.0, 1.2, t);
  const tension = smooth(ROOM, CHAIR[1], t);
  const black = smooth(BLACK - 0.15, BLACK + 0.1, t);

  return (
    <AbsoluteFill style={{background: '#000'}}>
      <AbsoluteFill style={{filter: `saturate(${0.9 - 0.2 * tension}) contrast(1.08)`}}>
        <ThreeCanvas width={width} height={height} linear={false} gl={{antialias: true}}>
          <Scene3D t={t} />
        </ThreeCanvas>
      </AbsoluteFill>
      <AbsoluteFill style={{background: `radial-gradient(ellipse at center, rgba(0,0,0,0) ${55 - 20 * tension}%, rgba(0,0,10,${0.3 + 0.4 * tension}) 100%)`, pointerEvents: 'none'}} />
      <AbsoluteFill style={{background: '#ffffff', opacity: white, pointerEvents: 'none'}} />
      <AbsoluteFill style={{background: '#000', opacity: Math.max(dip, black), pointerEvents: 'none'}} />
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
