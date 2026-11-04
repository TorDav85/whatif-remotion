import React from 'react';
import {smooth} from '../../core/animation';
import {CaptionTrack} from '../../shared/captions/CaptionTrack';
import {SAFE} from '../../shared/ui/PlatformSafeArea';
import captions from './captions.json';

const FONT = '"Arial Black", "Segoe UI Black", "Segoe UI", Arial, sans-serif';
const GOLD = '#ffc96b';
const SHADOW = '0 4px 22px rgba(0,0,0,.9), 0 2px 4px #000';
const CHAPTERS = [
  {from: 0, label: 'UNE VILLE ORDINAIRE', detail: 'Tout bascule en un instant'},
  {from: 4, label: 'MARC', detail: 'Une matinée comme les autres'},
  {from: 8, label: 'LE FLASH', detail: 'La lumière précède le souffle'},
  {from: 13, label: 'LA CHALEUR', detail: 'Des incendies peuvent se déclarer'},
  {from: 18, label: 'LE SOUFFLE', detail: 'L’onde de choc traverse les rues'},
  {from: 24, label: 'LE CHAMPIGNON', detail: 'Le danger continue'},
  {from: 29, label: 'APRÈS L’EXPLOSION', detail: 'Des dégâts très inégaux'},
  {from: 34, label: 'À L’ABRI', detail: 'Marc est en périphérie'},
  {from: 40, label: 'LES RETOMBÉES', detail: 'Schéma · le vent transporte les poussières'},
  {from: 46, label: 'ATTENDRE LES CONSIGNES', detail: 'La radio garde le lien'},
];

export const TextOverlay: React.FC<{t: number}> = ({t}) => {
  const chapter = [...CHAPTERS].reverse().find((item) => t >= item.from) ?? CHAPTERS[0];
  const partTwo = smooth(58.65, 58.95, t);
  const header = 1 - smooth(50.05, 50.4, t);
  const hook = smooth(0, 0.22, t) * (1 - smooth(3.65, 4, t));
  const chapterIn = smooth(chapter.from, chapter.from + 0.25, t);
  return (
    <>
      <div style={{position: 'absolute', top: SAFE.top, left: SAFE.left, right: SAFE.right,
        fontFamily: FONT, color: '#fff', textShadow: SHADOW, opacity: header}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 14, fontSize: 25, letterSpacing: 5, color: GOLD}}>
          <span style={{width: 28, height: 4, background: GOLD}} /> ET SI… <span style={{marginLeft: 'auto', fontSize: 20, letterSpacing: 4}}>PARTIE 1</span>
        </div>
        {t >= 4 && <div style={{marginTop: 16, fontSize: 42, lineHeight: 1.08, opacity: chapterIn}}>{chapter.label}</div>}
        {t >= 4 && <div style={{fontFamily: '"Segoe UI", Arial, sans-serif', fontSize: 25, marginTop: 10,
          color: '#e3e6e9', opacity: chapterIn}}>{chapter.detail}</div>}
      </div>
      {hook > 0 && <div style={{position: 'absolute', top: 610, left: SAFE.left, right: SAFE.right,
        fontFamily: FONT, textAlign: 'center', color: '#fff', fontSize: 78, lineHeight: 1.06,
        textShadow: SHADOW, WebkitTextStroke: '2px rgba(0,0,0,.6)', opacity: hook,
        transform: `translateY(${18 * (1 - hook)}px)`}}>
        ET SI UNE BOMBE<br /><span style={{color: GOLD}}>NUCLÉAIRE</span><br />TOMBAIT ?
      </div>}
      <CaptionTrack captions={captions} t={t} hidden={t < 4 || t >= 58.45}
        keywords={/^(flash|lumière|chaleur|incendies|choc|vitres|champignon|danger|radioactives|abri|Julien|ouvre)/i}
        color={GOLD} />
      {partTwo > 0 && <div style={{position: 'absolute', top: 830, left: SAFE.left, right: SAFE.right,
        textAlign: 'center', color: '#fff', fontFamily: FONT, lineHeight: 1.1,
        opacity: partTwo, textShadow: SHADOW}}>
        <div style={{fontSize: 34, letterSpacing: 9, color: '#c7cecb', marginBottom: 26}}>À SUIVRE</div>
        <div style={{fontSize: 102}}>PARTIE <span style={{color: GOLD}}>2</span></div>
        <div style={{height: 3, width: 95, margin: '30px auto', background: GOLD}} />
      </div>}
      <div style={{position: 'absolute', left: SAFE.left, right: SAFE.right, bottom: SAFE.bottom + 24,
        fontFamily: '"Segoe UI", Arial, sans-serif', fontSize: 23, color: '#e7e8ea', textShadow: SHADOW,
        opacity: 1 - smooth(58.3, 58.5, t)}}>
        Scénario fictif · temps et échelles stylisés
      </div>
    </>
  );
};
