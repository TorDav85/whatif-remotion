import React from 'react';
import type {CompiledTimeline} from '../timeline/types';

export const Subtitles: React.FC<{timeline: CompiledTimeline; time: number}> = ({timeline, time}) => {
  // Once a group ends, the next group takes priority; words ahead of the voice stay hidden.
  const subtitle = [...timeline.subtitles].reverse().find((entry) => time >= entry.start && time < entry.end);
  if (!subtitle) return null;
  return <div style={{position: 'absolute', bottom: 170, left: 72, right: 72, textAlign: 'center', fontSize: 55,
    lineHeight: 1.25, fontWeight: 600, textShadow: '0 2px 12px #213f45', color: '#fff6e0'}}>
    {subtitle.words.map((word, i) => <span key={i} style={{opacity: time >= word.start ? 1 : 0, color: time >= word.start && time < word.end ? '#f3c96b' : undefined}}>{word.text}{' '}</span>)}
  </div>;
};
