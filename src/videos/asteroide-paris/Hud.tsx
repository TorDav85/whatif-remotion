import React from 'react';
import {smooth} from '../../core/animation';
import {SERIF} from '../../shared/ui/tokens';
import {IMPACT, dustR} from './Scene3D';

const GOLD = '#F6E05E';
const RED = '#FF4D3D';

/**
 * Safe zone for TikTok / Reels / Shorts: the apps cover roughly the top 250 px (tabs, search)
 * and the right 160 px (buttons). The HUD starts at HUD_TOP instead of hugging the edge.
 */
export const HUD_TOP = 300;

const fmt = (n: number) => Math.round(n).toLocaleString('fr-FR');
const countdown = (t: number) => {
  const left = Math.max(0, IMPACT - t);
  return `00:${String(Math.floor(left)).padStart(2, '0')}.${Math.floor((left % 1) * 10)}`;
};

const statsAt = (t: number): {label: string; value: string}[] => {
  if (t < 7) return [{label: 'CIBLE', value: 'PARIS'}];
  if (t < IMPACT) {
    const out = [
      {label: 'VITESSE', value: '72 000 km/h'},
      {label: 'DISTANCE', value: `${fmt(20 * (IMPACT - t))} km`},
    ];
    if (t >= 11) out.push({label: 'TAILLE', value: '100 m'});
    return out;
  }
  const out = [{label: 'ÉNERGIE', value: '≈ 5 000 × Hiroshima'}];
  if (t >= 29) out.push({label: 'ONDE DE CHOC', value: '1 200 km/h'});
  if (t >= 33) out.push({label: 'RAYON', value: `${(dustR(t) * 0.04).toFixed(1).replace('.', ',')} km`});
  return out;
};

export const Hud: React.FC<{t: number}> = ({t}) => {
  const alpha = smooth(0.2, 0.7, t) * (1 - smooth(37, 37.5, t));
  if (alpha <= 0) return null;
  const pre = t < IMPACT;
  const urgent = pre && IMPACT - t < 10;
  const pulse = urgent ? 0.65 + 0.35 * Math.abs(Math.sin(t * Math.PI * 2)) : 1;
  const danger = pre ? 0.12 + 0.88 * smooth(0, IMPACT, t) : 1;

  return (
    <div style={{
      position: 'absolute', top: HUD_TOP, left: 56, right: 176,
      fontFamily: SERIF, color: GOLD, opacity: alpha,
      textShadow: '0 2px 12px rgba(0,0,0,0.75)',
      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    }}>
      <div>
        <div style={{fontSize: 21, letterSpacing: '0.18em', opacity: 0.75}}>{pre ? 'IMPACT DANS' : 'IMPACT'}</div>
        <div style={{fontSize: pre ? 64 : 48, fontWeight: 'bold', color: RED, opacity: pulse, fontVariantNumeric: 'tabular-nums', lineHeight: 1.1}}>
          {pre ? countdown(t) : 'CONFIRMÉ'}
        </div>
        {statsAt(t).map((s) => (
          <div key={s.label} style={{marginTop: 8}}>
            <span style={{fontSize: 19, letterSpacing: '0.12em', opacity: 0.7}}>{s.label} </span>
            <span style={{fontSize: 30}}>{s.value}</span>
          </div>
        ))}
      </div>
      <div style={{display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, marginTop: 6}}>
        <div style={{fontSize: 19, letterSpacing: '0.16em', opacity: 0.8}}>DANGER</div>
        <div style={{width: 160, height: 12, background: 'rgba(255,255,255,0.15)', borderRadius: 5, overflow: 'hidden'}}>
          <div style={{width: `${danger * 100}%`, height: '100%', background: danger > 0.7 ? RED : GOLD, opacity: pulse, borderRadius: 5}} />
        </div>
        <div style={{fontSize: 19, letterSpacing: '0.12em', opacity: 0.75, marginTop: 4}}>📍 PARIS</div>
      </div>
    </div>
  );
};
