import React from 'react';
import {useCurrentFrame} from 'remotion';
import {SERIF, activeBeat, beatAlpha, inkColor} from './Hud';
import {useScenario} from '../Scenario';
import type {Beat} from './Hud';

export const Captions: React.FC = () => {
  const {timeline} = useScenario();
  const frame = useCurrentFrame();
  const t = frame / timeline.fps;
  const b = activeBeat(t, timeline.beats as Beat[]);
  if (!b?.caption) return null;
  return (
    <div
      style={{
        position: 'absolute', left: 90, right: 90, bottom: 330, textAlign: 'center',
        fontFamily: SERIF, fontStyle: 'italic', fontSize: 58, lineHeight: 1.2,
        color: inkColor(t, timeline.flash), opacity: beatAlpha(b, t),
        textShadow: '0 2px 14px rgba(0,0,0,0.65)',
      }}
    >
      {b.caption}
    </div>
  );
};
