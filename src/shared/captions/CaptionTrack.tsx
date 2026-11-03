import React from 'react';
import {smooth} from '../../core/animation';
import {SAFE} from '../ui/PlatformSafeArea';

export type CaptionSegment = {start: number; end: number; text: string; beat?: string};
export type CaptionWord = {start: number; end: number; text: string; beat?: string};
export type Captions = {segments: CaptionSegment[]; words?: CaptionWord[]};

const SANS = '"Arial Black", "Segoe UI Black", "Segoe UI", Arial, sans-serif';
const SHADOW = '0 4px 18px rgba(0,0,0,0.85), 0 2px 4px rgba(0,0,0,0.9)';
/** A segment stays up until the next one starts, at most this long after its last word. */
const HOLD = 0.35;

/** Segment on screen at time t (from scripts/audio/captions.py, timed on the voice). */
export const segmentAt = (captions: Captions, t: number) => {
  const s = captions.segments;
  for (let i = 0; i < s.length; i++) {
    const next = s[i + 1]?.start ?? Infinity;
    if (t >= s[i].start - 0.05 && t < Math.min(next - 0.02, s[i].end + HOLD)) return s[i];
  }
  return null;
};

/** Time the voice says a word of the script (first match after `after`), for syncing graphics. */
export const wordTime = (captions: Captions, word: RegExp, after = 0) =>
  captions.words?.find((w) => w.start >= after && word.test(w.text))?.start ?? null;

/**
 * Short synced caption groups (two lines at most), instead of the whole line at once.
 * The word being spoken is white; keywords are gold.
 */
export const CaptionTrack: React.FC<{captions: Captions; t: number; keywords?: RegExp; color?: string; hidden?: boolean}> = ({
  captions, t, keywords, color = '#F6E05E', hidden,
}) => {
  const seg = segmentAt(captions, t);
  if (!seg || hidden) return null;
  const pop = smooth(seg.start - 0.05, seg.start + 0.08, t);
  const words = seg.text.split(' ');
  const timed = captions.words?.filter((w) => w.start >= seg.start - 0.001 && w.end <= seg.end + 0.001) ?? [];
  return (
    <div style={{
      position: 'absolute', top: SAFE.captionTop, left: SAFE.left + 14, right: SAFE.right,
      textAlign: 'center', fontFamily: SANS, fontSize: 64, lineHeight: 1.15,
      color: '#fff', textShadow: SHADOW, WebkitTextStroke: '3px rgba(0,0,0,0.6)',
      transform: `scale(${0.9 + 0.1 * pop})`, opacity: pop,
    }}>
      {words.map((w, i) => {
        const said = timed[i] ? t >= timed[i].start - 0.03 : true;
        const key = keywords?.test(w.replace(/^[.…]+/, ''));
        return <span key={i} style={{color: key ? color : '#fff', opacity: said ? 1 : 0.55}}>{w} </span>;
      })}
    </div>
  );
};
