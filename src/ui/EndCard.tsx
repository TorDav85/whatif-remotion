import React from 'react';
import {useCurrentFrame} from 'remotion';
import {FPS, T, smooth} from '../world';
import {SERIF} from './Hud';

export const EndCard: React.FC<{from: number}> = ({from}) => {
  const frame = useCurrentFrame();
  const t = from + frame / FPS;
  const a = smooth(from, from + 0.5, t);
  const title = (T.beats[0] as {title?: string}).title ?? '';
  return (
    <div
      style={{
        position: 'absolute', inset: 0, background: '#05060b', color: '#f3efe6', opacity: a,
        fontFamily: SERIF, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 110px', gap: 44,
      }}
    >
      <div style={{fontSize: 60, lineHeight: 1.2}}>{title}</div>
      <div style={{fontSize: 24, letterSpacing: '0.16em', opacity: 0.7, lineHeight: 1.7}}>
        CECI EST UNE FICTION
        <br />
        LES TROUS NOIRS CONNUS PÈSENT
        <br />
        PLUSIEURS FOIS LE SOLEIL
      </div>
      <div style={{fontSize: 34, letterSpacing: '0.16em'}}>OÙ SERAIS-TU ?</div>
      <div style={{fontSize: 26, letterSpacing: '0.12em', opacity: 0.8}}>{T.handle}</div>
    </div>
  );
};
