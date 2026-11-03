import React from 'react';
import {Audio, Sequence, staticFile, useVideoConfig} from 'remotion';

type Beat = {t: number; end: number; voice?: string; caption?: string; title?: unknown};
type Props = {audio: {voice?: boolean; voiceDir?: string}; beats: readonly Beat[]; title?: string; volume?: number};

/** Optional narration for any timeline expressed in seconds; matches XTTS text selection. */
export const VoiceTrack: React.FC<Props> = ({audio, beats, title, volume = 1}) => {
  const {fps} = useVideoConfig();
  if (!audio.voice || !audio.voiceDir) return null;
  return <>{beats.map((beat, i) => {
    const text = beat.voice !== undefined ? beat.voice : beat.caption || (beat.title === true ? title : beat.title);
    if (typeof text !== 'string' || !text.trim()) return null;
    const end = Math.min(beat.end, beats[i + 1]?.t ?? beat.end);
    const frames = Math.round((end - beat.t) * fps);
    if (frames <= 0) return null;
    return <Sequence key={i} from={Math.round(beat.t * fps)} durationInFrames={frames}>
      <Audio src={staticFile(`${audio.voiceDir}/beat-${i}.wav`)} volume={volume} />
    </Sequence>;
  })}</>;
};
