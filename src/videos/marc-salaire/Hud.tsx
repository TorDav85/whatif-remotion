import React from 'react';
import {smooth} from '../../core/animation';
import {SERIF} from '../../shared/ui/tokens';
import {MSG, NIGHT, balanceAt, monthAt} from './Scene3D';

const GOLD = '#F6E05E';
const GREEN = '#5BE38A';
const RED = '#FF4D3D';

/** Same safe zone as the other Marc videos: below the app tabs, left of the buttons. */
export const HUD_TOP = 300;

export const euros = (n: number, digits = 2) =>
  n.toLocaleString('fr-FR', {minimumFractionDigits: digits, maximumFractionDigits: digits}) + ' €';

export const Hud: React.FC<{t: number}> = ({t}) => {
  const alpha = smooth(4.4, 4.9, t) * (1 - smooth(63.8, 64.4, t));
  if (alpha <= 0) return null;
  const months = Math.round(monthAt(t));
  const balance = balanceAt(t);
  // The balance flashes green when money lands.
  const landing = [6.2, 16.8, 28.0, 47.0].some((at) => t >= at && t < at + 1.8);
  const status = t >= MSG[0] ? ['EN MISSION ?', RED] : t >= NIGHT ? ['SURVEILLÉ 👀', '#FF9F40'] : t >= 21.8 ? ['SANS EMPLOI 😎', GOLD] : ['SALARIÉ… DE QUI ?', '#fff'];

  return (
    <div style={{
      position: 'absolute', top: HUD_TOP, left: 56, right: 176,
      fontFamily: SERIF, color: GOLD, opacity: alpha,
      textShadow: '0 2px 12px rgba(0,0,0,0.85)',
      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    }}>
      <div>
        <div style={{fontSize: 21, letterSpacing: '0.18em', opacity: 0.8}}>SOLDE DE MARC</div>
        <div style={{
          fontSize: 62, fontWeight: 'bold', color: landing ? GREEN : '#fff', lineHeight: 1.05, fontVariantNumeric: 'tabular-nums',
          transform: `scale(${landing ? 1.06 : 1})`, transformOrigin: 'left center',
        }}>
          {euros(balance)}
        </div>
        <div style={{marginTop: 8}}>
          <span style={{fontSize: 19, letterSpacing: '0.12em', opacity: 0.7}}>EMPLOYEUR </span>
          <span style={{fontSize: 26, color: '#fff'}}>ORION ❓</span>
        </div>
        <div style={{marginTop: 6}}>
          <span style={{fontSize: 19, letterSpacing: '0.12em', opacity: 0.7}}>STATUT </span>
          <span style={{fontSize: 24, color: status[1]}}>{status[0]}</span>
        </div>
      </div>
      <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 6}}>
        <div style={{fontSize: 17, letterSpacing: '0.12em', opacity: 0.8}}>MOIS</div>
        <div style={{fontSize: 64, fontWeight: 'bold', color: '#fff', lineHeight: 1}}>{months}</div>
        <div style={{fontSize: 17, letterSpacing: '0.1em', opacity: 0.8, marginTop: 4}}>JOURS TRAVAILLÉS</div>
        <div style={{fontSize: 44, fontWeight: 'bold', color: RED, lineHeight: 1}}>0</div>
      </div>
    </div>
  );
};
