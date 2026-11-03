import React from 'react';
import {smooth} from '../../core/animation';
import {SERIF} from '../../shared/ui/tokens';
import {CRUMBLE, DOOR_CLOSE, FIRE, MINUTES, minuteAt, tempAt} from './Scene3D';

const GOLD = '#F6E05E';
const RED = '#FF4D3D';

/** Same safe zone as the other Marc videos: below the app tabs, left of the buttons. */
export const HUD_TOP = 300;

const fr = (n: number) => Math.round(n).toLocaleString('fr-FR');

/** Colour of the temperature: blue-white, then yellow, orange, red, then white-hot. */
export const tempColor = (c: number) =>
  c < 45 ? '#9fd8ff' : c < 100 ? GOLD : c < 250 ? '#FF9F40' : c < 800 ? RED : '#FFF3D6';

const LIKE: [number, string][] = [
  [0, ''], [36, 'UN BAIN TIÈDE 🛁'], [70, 'UN SAUNA FINLANDAIS 🧖'], [140, 'UNE THÉIÈRE 🫖'],
  [290, 'UN FOUR À PIZZA 🍕'], [580, 'DES BRAISES DE BARBECUE 🔥'], [1150, 'DE LA LAVE 🌋'],
];
const STATE: [number, string][] = [
  [0, 'DÉTENDU 😎'], [MINUTES[0], 'EN SUEUR 💦'], [MINUTES[1], 'FUMANT 💨'], [FIRE, 'EN FEU 🔥'],
  [MINUTES[3], 'GRILLÉ 🍞'], [CRUMBLE, 'POUSSIÈRE ⏳'],
];
const last = <T,>(rows: [number, T][], x: number) => rows.filter(([at]) => x >= at).pop()?.[1];

export const Hud: React.FC<{t: number}> = ({t}) => {
  const alpha = smooth(DOOR_CLOSE + 0.6, DOOR_CLOSE + 1.2, t) * (1 - smooth(68.6, 69.2, t));
  if (alpha <= 0) return null;
  const c = tempAt(t);
  const minute = Math.floor(minuteAt(t) + 0.02);
  // Log scale from 38 °C to 1216 °C.
  const fill = Math.max(0.03, Math.log(c / 38) / Math.log(1216 / 38));
  // The number pops each time the temperature doubles.
  const flash = MINUTES.reduce((m, at) => Math.max(m, t >= at ? 1 - Math.min(1, (t - at) / 0.8) : 0), 0);

  return (
    <div style={{
      position: 'absolute', top: HUD_TOP, left: 56, right: 176,
      fontFamily: SERIF, color: GOLD, opacity: alpha,
      textShadow: '0 2px 12px rgba(0,0,0,0.85)',
      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    }}>
      <div>
        <div style={{fontSize: 21, letterSpacing: '0.18em', opacity: 0.8}}>MINUTE</div>
        <div style={{fontSize: 52, fontWeight: 'bold', color: '#fff', lineHeight: 1.05}}>{String(minute).padStart(2, '0')}</div>
        <div style={{fontSize: 19, letterSpacing: '0.12em', opacity: 0.7, marginTop: 10}}>TEMPÉRATURE</div>
        <div style={{
          fontSize: 76, fontWeight: 'bold', color: tempColor(c), lineHeight: 1.05, fontVariantNumeric: 'tabular-nums',
          transform: `scale(${1 + 0.18 * flash})`, transformOrigin: 'left center',
        }}>
          {fr(c)} °C
        </div>
        <div style={{marginTop: 6}}>
          <span style={{fontSize: 19, letterSpacing: '0.12em', opacity: 0.7}}>COMME </span>
          <span style={{fontSize: 24, color: '#fff'}}>{last(LIKE, c)}</span>
        </div>
        <div style={{marginTop: 6}}>
          <span style={{fontSize: 19, letterSpacing: '0.12em', opacity: 0.7}}>MARC </span>
          <span style={{fontSize: 24, color: t >= FIRE ? RED : '#fff'}}>{last(STATE, t)}</span>
        </div>
      </div>
      <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, marginTop: 6}}>
        <div style={{fontSize: 30, fontWeight: 'bold', color: RED}}>×2</div>
        <div style={{fontSize: 17, letterSpacing: '0.12em', opacity: 0.8}}>CHAQUE MINUTE</div>
        {/* Thermometer */}
        <div style={{position: 'relative', width: 34, height: 230, marginTop: 8}}>
          <div style={{position: 'absolute', left: 9, top: 0, width: 16, height: 200, borderRadius: 8, background: 'rgba(255,255,255,0.18)', overflow: 'hidden'}}>
            <div style={{position: 'absolute', bottom: 0, width: '100%', height: `${fill * 100}%`, background: tempColor(c), borderRadius: 8}} />
          </div>
          <div style={{position: 'absolute', left: 0, bottom: 0, width: 34, height: 34, borderRadius: 17, background: tempColor(c)}} />
        </div>
      </div>
    </div>
  );
};
