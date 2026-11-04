import React from 'react';
import {smooth} from '../../core/animation';
import {SERIF} from '../../shared/ui/tokens';
import {BIKE, CCTV, DARK, DIGEST, EYE, EYE_MARC, HEAT, HOURS, LOCK, LUNCH, MORNING, POV, PUNCH, STREET, WATTS, digestAt, visiblePct} from './Scene3D';

const GOLD = '#F6E05E';
const HOT = '#FF9A3C';

/** Same safe zone as the other Marc videos: below the app tabs, left of the buttons. */
export const HUD_TOP = 300;

/** Clock shown in the corner. */
const clockAt = (t: number) => {
  if (t < STREET) return '07 h 00';
  if (t < LUNCH) return '09 h 30';
  if (t < PUNCH) {
    const h = 12 + 3 * digestAt(t);
    return `${String(Math.floor(h)).padStart(2, '0')} h ${String(Math.floor((h % 1) * 60)).padStart(2, '0')}`;
  }
  return '16 h 00';
};

/** One stat line that changes with each consequence. */
const statAt = (t: number): [string, string, string?] | null => {
  if (t < EYE) return ['VISIBLE', `${visiblePct(t)} %`];
  if (t < EYE_MARC) return ['RÉTINE', 'ARRÊTE LA LUMIÈRE'];
  if (t < POV) return ['RÉTINE DE MARC', 'TRANSPARENTE'];
  if (t < STREET) return ['VISION', `${Math.round(100 * (1 - smooth(DARK[0], DARK[1], t)))} %`];
  if (t < HEAT) return ['VISION', '0 %', t >= BIKE ? 'COLLISIONS : 1' : undefined];
  if (t < WATTS) return ['CORPS', '37 °C'];
  if (t < CCTV) return ['CHALEUR RAYONNÉE', '≈ 100 W'];
  if (t < LUNCH) return ['REPÉRÉ PAR', t >= LOCK ? 'LA POLICE' : '…'];
  if (t < DIGEST) return ['VISIBLE', 'SON DÉJEUNER'];
  if (t < PUNCH) return ['DIGESTION', `${Math.round(100 * digestAt(t))} %`, t >= HOURS[0] ? '≈ 2 À 4 HEURES' : undefined];
  return null;
};

export const Hud: React.FC<{t: number}> = ({t}) => {
  const alpha = smooth(MORNING + 0.3, MORNING + 0.9, t) * (1 - smooth(PUNCH - 0.4, PUNCH, t));
  if (alpha <= 0) return null;
  const stat = statAt(t);
  const hot = t >= HEAT && t < LUNCH;
  return (
    <div style={{
      position: 'absolute', top: HUD_TOP, left: 56, right: 176,
      fontFamily: SERIF, color: GOLD, opacity: alpha,
      textShadow: '0 2px 12px rgba(0,0,0,0.85)',
    }}>
      <div style={{fontSize: 21, letterSpacing: '0.18em', opacity: 0.8}}>HEURE</div>
      <div style={{fontSize: 52, fontWeight: 'bold', color: '#fff', lineHeight: 1.05, fontVariantNumeric: 'tabular-nums'}}>{clockAt(t)}</div>
      {stat && (
        <div style={{marginTop: 10}}>
          <div style={{fontSize: 19, letterSpacing: '0.12em', opacity: 0.7}}>{stat[0]}</div>
          <div style={{fontSize: stat[1].length > 10 ? 44 : 64, fontWeight: 'bold', color: hot ? HOT : '#fff', lineHeight: 1.05, fontVariantNumeric: 'tabular-nums'}}>{stat[1]}</div>
          {stat[2] && <div style={{fontSize: 22, color: GOLD, marginTop: 4}}>{stat[2]}</div>}
        </div>
      )}
    </div>
  );
};

