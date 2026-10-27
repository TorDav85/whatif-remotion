import React from 'react';
import {useCurrentFrame} from 'remotion';
import {FPS} from '../world';
import {SERIF, activeBeat, beatAlpha, inkColor} from './Hud';

export const Captions: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const b = activeBeat(t);
  if (!b?.caption) return null;
  return (
    <div
      style={{
        position: 'absolute', left: 90, right: 90, bottom: 330, textAlign: 'center',
        fontFamily: SERIF, fontStyle: 'italic', fontSize: 58, lineHeight: 1.2,
        color: inkColor(t), opacity: beatAlpha(b, t),
        textShadow: '0 2px 14px rgba(0,0,0,0.65)',
      }}
    >
      {b.caption}
    </div>
  );
};
