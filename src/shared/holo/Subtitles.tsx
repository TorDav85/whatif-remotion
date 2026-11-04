/**
 * Subtitles of the holo style: same caption data and timing as CaptionTrack (scripts/audio/captions.py),
 * shown as a monospace terminal line — words light up as they are said, a cursor blinks after them.
 */
import React from 'react';
import {smooth} from '../../core/animation';
import {segmentAt, type Captions} from '../captions/CaptionTrack';
import {SAFE} from '../ui/PlatformSafeArea';
import {HOLO_DEFAULT, neonShadow, type HoloTheme} from './theme';

export const Subtitles: React.FC<{
  captions: Captions; t: number; theme?: HoloTheme; keywords?: RegExp; keywordColor?: string; opacity?: number; top?: number;
}> = ({captions, t, theme = HOLO_DEFAULT, keywords, keywordColor, opacity = 1, top = SAFE.captionTop}) => {
  const seg = segmentAt(captions, t);
  if (!seg || opacity <= 0) return null;
  const pop = smooth(seg.start - 0.05, seg.start + 0.1, t);
  const words = seg.text.split(' ');
  const timed = captions.words?.filter((w) => w.start >= seg.start - 0.001 && w.end <= seg.end + 0.001) ?? [];
  const cursor = Math.floor(t * 3) % 2 === 0;
  const kc = keywordColor ?? theme.secondary;
  return (
    <div style={{
      position: 'absolute', top, left: SAFE.left + 14, right: SAFE.right, textAlign: 'center',
      fontFamily: theme.font, fontWeight: 700, fontSize: 60, lineHeight: 1.2, letterSpacing: 1,
      opacity: pop * opacity, transform: `translateY(${(1 - pop) * 14}px)`,
    }}>
      <span style={{
        display: 'inline', padding: '4px 14px', background: 'rgba(0, 10, 16, 0.62)',
        boxDecorationBreak: 'clone', WebkitBoxDecorationBreak: 'clone', borderLeft: `4px solid ${theme.primary}`,
      }}>
        {words.map((w, i) => {
          const said = timed[i] ? t >= timed[i].start - 0.03 : true;
          const key = keywords?.test(w.replace(/^[.…«]+/, ''));
          const c = key ? kc : theme.text;
          return (
            <span key={i} style={{color: c, opacity: said ? 1 : 0.4, textShadow: said ? neonShadow(key ? kc : theme.primary, key ? 0.9 : 0.5) : 'none'}}>
              {w}{i < words.length - 1 ? ' ' : ''}
            </span>
          );
        })}
        <span style={{color: theme.primary, opacity: cursor ? 1 : 0}}>_</span>
      </span>
    </div>
  );
};
