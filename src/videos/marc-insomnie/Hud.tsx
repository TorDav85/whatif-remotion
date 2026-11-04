import React from 'react';
import {smooth} from '../../core/animation';
import {SERIF} from '../../shared/ui/tokens';
import {BRAIN, CAR, GARDNER, NIGHT, PUNCH, RAT, RECORD, WHY, dayAt, hoursAt} from './Scene3D';
import {END} from './TextOverlay';

const GOLD = '#F6E05E';
const RED = '#FF6B6B';

/** Same safe zone as the other Marc videos: below the app tabs, left of the buttons. */
export const HUD_TOP = 300;

/** Extra line under the counter. */
const noteAt = (t: number): [string, string, string?] | null => {
  if (t >= CAR && t < CAR + 5.6) return ['VITESSE', '110 km/h', '= 30,6 m CHAQUE SECONDE'];
  if (t >= RECORD + 4.8 && t < GARDNER) return ['RECORD HUMAIN', '264 h', 'RANDY GARDNER, 1964'];
  return null;
};

export const Hud: React.FC<{t: number}> = ({t}) => {
  const alpha = smooth(NIGHT + 0.3, NIGHT + 0.9, t) * (1 - smooth(END - 0.4, END, t));
  if (alpha <= 0) return null;
  const outside = t >= GARDNER && t < PUNCH;
  const h = Math.round(hoursAt(t));
  const note = noteAt(t);
  return (
    <div style={{
      position: 'absolute', top: HUD_TOP, left: 56, right: 176,
      fontFamily: SERIF, color: GOLD, opacity: alpha,
      textShadow: '0 2px 12px rgba(0,0,0,0.85)',
    }}>
      {outside ? (
        <>
          <div style={{fontSize: 21, letterSpacing: '0.18em', opacity: 0.8}}>
            {t < RAT ? 'ARCHIVE' : t < BRAIN ? 'RAT DE LABORATOIRE' : 'CERVEAU DE SOURIS'}
          </div>
          <div style={{fontSize: 52, fontWeight: 'bold', color: '#fff', lineHeight: 1.05}}>
            {t < RAT ? '1964' : t < WHY ? '11 À 32 JOURS' : t < BRAIN ? 'TEMPÉRATURE ↓' : 'SYNAPSES ATTAQUÉES'}
          </div>
          {t < RAT && <div style={{fontSize: 22, marginTop: 4}}>APRÈS 264 h : 14 h DE SOMMEIL</div>}
          {t >= RAT && t < WHY && <div style={{fontSize: 22, marginTop: 4}}>DE SURVIE SANS SOMMEIL</div>}
        </>
      ) : (
        <>
          <div style={{fontSize: 21, letterSpacing: '0.18em', opacity: 0.8}}>ÉVEILLÉ DEPUIS</div>
          <div style={{fontSize: 64, fontWeight: 'bold', color: h >= 72 ? RED : '#fff', lineHeight: 1.05, fontVariantNumeric: 'tabular-nums'}}>{h} h</div>
          <div style={{fontSize: 26, marginTop: 4}}>JOUR {dayAt(t)} · 0 MIN DE SOMMEIL</div>
          {note && (
            <div style={{marginTop: 12}}>
              <div style={{fontSize: 19, letterSpacing: '0.12em', opacity: 0.7}}>{note[0]}</div>
              <div style={{fontSize: 44, fontWeight: 'bold', color: '#fff', lineHeight: 1.05}}>{note[1]}</div>
              {note[2] && <div style={{fontSize: 22, marginTop: 4}}>{note[2]}</div>}
            </div>
          )}
        </>
      )}
    </div>
  );
};
