import React from 'react';
import type {CompiledTimeline} from '../timeline/types';
import {eventOf, eventProgress} from '../timeline/runtime.mjs';

export const NarrativeHud: React.FC<{timeline: CompiledTimeline; time: number}> = ({timeline, time}) => {
  const collapse = eventProgress(eventOf(timeline, 'bridgeCollapse'), time);
  const editorial = timeline.editorials.find((item) => time >= item.start && time < item.end);
  const conclusion = timeline.conclusion;
  const endAlpha = Math.min(1, Math.max(0, (time - conclusion.start) / 0.4));
  return <>
    <div style={{position: 'absolute', top: 110, left: 72, right: 72, color: '#23464b'}}>
      <div style={{fontSize: 23, letterSpacing: '0.15em', fontWeight: 700}}>UNE HISTOIRE DE TEMPS</div>
      <div style={{fontSize: 60, fontWeight: 650, maxWidth: 900, marginTop: 18, lineHeight: 1.05}}>{timeline.title}</div>
      <div style={{fontSize: 24, marginTop: 24, color: '#45686b'}}>{timeline.handle} · SCÈNE STYLISÉE</div>
    </div>
    {editorial && <div style={{position: 'absolute', top: 430, left: 72, fontSize: 27, color: '#6f553c', letterSpacing: '0.08em', borderLeft: '4px solid #ba8a4f', padding: '12px 22px'}}>{editorial.title}</div>}
    <div style={{position: 'absolute', left: 72, right: 72, bottom: 82, height: 3, background: '#45686b44'}}><div style={{height: 3, background: '#ba8a4f', width: `${collapse * 100}%`}} /></div>
    <div style={{position: 'absolute', inset: 0, background: `rgba(30, 57, 62, ${endAlpha * 0.9})`, opacity: endAlpha,
      display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 88, color: '#f4e7c8', pointerEvents: 'none'}}>
      <div style={{fontSize: 72, fontWeight: 650, lineHeight: 1.1}}>{conclusion.title}</div>
      <div style={{fontSize: 34, lineHeight: 1.5, marginTop: 34}}>{conclusion.text}</div>
    </div>
  </>;
};
