import React from 'react';
import {smooth} from '../../core/animation';
import {SERIF} from '../../shared/ui/tokens';
import {DAYS, STOP, dayAt, dayFloat, heartRate, temperature, waterLost} from './Scene3D';

const BLUE = '#5FB8F5';
const GOLD = '#F6E05E';
const ORANGE = '#FF9F40';
const RED = '#FF4D3D';
const GREEN = '#7BDB7B';

/** Same safe zone as the other Marc videos: below the app tabs, left of the buttons. */
export const HUD_TOP = 300;
const BODY_KG = 75;
const BODY_WATER_L = 45; // 60 % of 75 kg

const fr = (n: number, digits = 0) => n.toLocaleString('fr-FR', {maximumFractionDigits: digits, minimumFractionDigits: digits});

type Status = [string, string];
/** Organ status by days without water. */
const ORGANS: {name: string; at: (d: number) => Status}[] = [
  {name: 'REINS', at: (d) => (d < 1 ? ['OK', GREEN] : d < 3 ? ['ÉCONOMIE', ORANGE] : ['DÉFAILLANCE', RED])},
  {name: 'SANG', at: (d) => (d < 1.4 ? ['NORMAL', GREEN] : d < 3 ? ['ÉPAIS', ORANGE] : ['TOXIQUE', RED])},
  {name: 'CERVEAU', at: (d) => (d < 2 ? ['OK', GREEN] : d < 4 ? ['VERTIGES', ORANGE] : ['CONFUS', RED])},
];

/** Marc's silhouette, filled with water up to `level` (0..1). */
const BodyGauge: React.FC<{level: number; pulse: number}> = ({level, pulse}) => {
  const h = 230;
  const top = 12 + (1 - level) * (h - 12);
  return (
    <svg width={110} height={h} viewBox={`0 0 110 ${h}`}>
      <defs>
        <clipPath id="marc-body">
          <circle cx={55} cy={24} r={20} />
          <rect x={30} y={48} width={50} height={86} rx={14} />
          <rect x={12} y={52} width={16} height={72} rx={8} />
          <rect x={82} y={52} width={16} height={72} rx={8} />
          <rect x={33} y={128} width={19} height={100} rx={8} />
          <rect x={58} y={128} width={19} height={100} rx={8} />
        </clipPath>
      </defs>
      <g clipPath="url(#marc-body)">
        <rect x={0} y={0} width={110} height={h} fill="rgba(255,255,255,0.14)" />
        <rect x={0} y={top} width={110} height={h - top} fill={BLUE} opacity={0.85} />
        <rect x={0} y={top} width={110} height={4} fill="#d6f0ff" />
      </g>
      {/* Heart, beating */}
      <circle cx={62} cy={70} r={6 * (1 + 0.35 * pulse)} fill={RED} opacity={0.9} />
    </svg>
  );
};

export const Hud: React.FC<{t: number}> = ({t}) => {
  const alpha = smooth(DAYS[0] - 0.2, DAYS[0] + 0.3, t) * (1 - smooth(STOP - 1.4, STOP - 0.4, t));
  if (alpha <= 0) return null;
  const d = dayFloat(t);
  const lost = waterLost(t);
  const bpm = heartRate(t);
  const temp = temperature(t);
  const beat = (t * bpm) / 60;
  const pulse = Math.pow(Math.max(0, Math.sin(Math.PI * (beat % 1))), 8);
  const fever = temp >= 38;

  return (
    <div style={{
      position: 'absolute', top: HUD_TOP, left: 56, right: 176,
      fontFamily: SERIF, color: GOLD, opacity: alpha,
      textShadow: '0 2px 12px rgba(0,0,0,0.85)',
      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    }}>
      <div>
        <div style={{fontSize: 21, letterSpacing: '0.18em', opacity: 0.8}}>JOUR</div>
        <div style={{fontSize: 64, fontWeight: 'bold', color: '#fff', lineHeight: 1.05}}>{dayAt(t)}<span style={{fontSize: 30, opacity: 0.6}}> / 7</span></div>
        <div style={{marginTop: 8}}>
          <span style={{fontSize: 19, letterSpacing: '0.12em', opacity: 0.7}}>EAU PERDUE </span>
          <span style={{fontSize: 32, color: BLUE}}>{fr(lost, 1)} L</span>
        </div>
        <div style={{marginTop: 6}}>
          <span style={{fontSize: 19, letterSpacing: '0.12em', opacity: 0.7}}>DÉSHYDRATATION </span>
          <span style={{fontSize: 28, color: lost / BODY_KG > 0.1 ? RED : lost / BODY_KG > 0.04 ? ORANGE : '#fff'}}>−{fr((lost / BODY_KG) * 100, 1)} %</span>
        </div>
        <div style={{marginTop: 6}}>
          <span style={{fontSize: 19, letterSpacing: '0.12em', opacity: 0.7}}>CŒUR </span>
          <span style={{fontSize: 28, color: bpm > 120 ? RED : bpm > 95 ? ORANGE : '#fff', fontVariantNumeric: 'tabular-nums'}}>{bpm} bpm</span>
          <span style={{fontSize: 24, color: RED, marginLeft: 8, opacity: 0.4 + 0.6 * pulse}}>♥</span>
        </div>
        {fever && (
          <div style={{marginTop: 6}}>
            <span style={{fontSize: 19, letterSpacing: '0.12em', opacity: 0.7}}>TEMPÉRATURE </span>
            <span style={{fontSize: 28, color: RED}}>{fr(temp, 1)} °C</span>
          </div>
        )}
        <div style={{marginTop: 14, display: 'flex', flexDirection: 'column', gap: 4}}>
          {ORGANS.map((o) => {
            const [label, color] = o.at(d);
            return (
              <div key={o.name} style={{fontSize: 18, letterSpacing: '0.1em'}}>
                <span style={{opacity: 0.7}}>{o.name} </span><span style={{color}}>● {label}</span>
              </div>
            );
          })}
        </div>
      </div>
      <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, marginTop: 6}}>
        <BodyGauge level={(BODY_WATER_L - lost) / BODY_WATER_L} pulse={pulse} />
        <div style={{fontSize: 17, letterSpacing: '0.12em', opacity: 0.8}}>EAU DU CORPS</div>
        <div style={{fontSize: 26, color: '#fff'}}>{fr(((BODY_WATER_L - lost) / (BODY_KG - lost)) * 100, 0)} %</div>
      </div>
    </div>
  );
};
