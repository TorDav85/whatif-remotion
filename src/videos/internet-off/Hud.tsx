import React from 'react';
import {smooth} from '../../core/animation';

const SERIF = 'Georgia, "Times New Roman", serif';
const GOLD = '#F6E05E';
const GOLD_DIM = 'rgba(246,224,94,0.5)';

const lerp = (a: number, b: number, t: number) => a + (b - a) * Math.max(0, Math.min(1, t));
const fmt = (n: number) => n.toLocaleString('fr-FR');

type HudData = {
  connection: string;
  connectionColor: string;
  stats: {label: string; value: string}[];
};

const hudAt = (t: number): HudData => {
  if (t < 5) return {connection: 'ACTIVE', connectionColor: '#48BB78', stats: [{label: 'USAGERS', value: '5.2 MILLIARDS'}]};
  if (t < 15) {
    const panic = Math.round(lerp(0, 89, smooth(5, 15, t)));
    return {connection: 'PERDUE', connectionColor: '#E53E3E', stats: [{label: 'PANIQUE', value: `${panic}%`}]};
  }
  if (t < 25) {
    const pop = Math.round(lerp(847, 12, smooth(15, 24, t)));
    return {connection: 'PERDUE', connectionColor: '#E53E3E', stats: [{label: 'POPULATION RUE', value: fmt(pop)}, {label: 'SILENCE', value: '98 dB'}]};
  }
  if (t < 40) {
    const conv = Math.round(lerp(0, 340, smooth(25, 39, t)));
    return {connection: 'PERDUE', connectionColor: '#E53E3E', stats: [{label: 'CONVERSATIONS', value: `+${conv}%`}, {label: 'SOURIRES', value: 'DÉTECTÉS'}]};
  }
  if (t < 55) {
    const q = Math.round(lerp(0, 1247, smooth(40, 54, t)));
    return {connection: 'PERDUE', connectionColor: '#E53E3E', stats: [{label: 'QUESTIONS POSÉES', value: fmt(q)}]};
  }
  if (t < 70) {
    const liens = Math.round(lerp(0, 892, smooth(55, 69, t)));
    const emp = Math.round(lerp(0, 567, smooth(55, 69, t)));
    return {connection: 'PERDUE', connectionColor: '#E53E3E', stats: [{label: 'LIENS CRÉÉS', value: fmt(liens)}, {label: 'EMPATHIE', value: `+${emp}%`}]};
  }
  if (t < 80) return {connection: '?', connectionColor: '#F6E05E', stats: [{label: 'CHOIX', value: 'LE TIEN'}]};
  return {connection: '—', connectionColor: '#666', stats: []};
};

// WiFi gauge (0-20s full, 20-40s emptying)
const wifiLevel = (t: number) => {
  if (t < 5) return 1;
  if (t < 8) return 1 - smooth(5, 8, t);
  return 0;
};

// Human connection gauge (20s start filling, 40s full, then pulses)
const humanLevel = (t: number) => {
  if (t < 20) return 0;
  if (t < 40) return smooth(20, 40, t);
  return 1;
};

const GaugeBar: React.FC<{label: string; level: number; color: string; pulse?: boolean; t?: number}> = ({label, level, color, pulse, t = 0}) => (
  <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
    <div style={{fontSize: 14, letterSpacing: '0.08em', color: GOLD_DIM, minWidth: 50}}>{label}</div>
    <div style={{width: 80, height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden'}}>
      <div style={{
        width: `${level * 100}%`, height: '100%', background: color, borderRadius: 3,
        opacity: pulse ? 0.7 + Math.sin(t * 5) * 0.3 : 1,
      }} />
    </div>
  </div>
);

export const Hud: React.FC<{t: number}> = ({t}) => {
  const data = hudAt(t);
  const alpha = t < 80 ? Math.min(1, smooth(0, 0.5, t)) * (1 - smooth(79, 80, t)) : 0;
  if (alpha <= 0) return null;

  const wifi = wifiLevel(t);
  const human = humanLevel(t);
  const humanPulse = t >= 40 && t < 80;

  return (
    <div style={{
      position: 'absolute', top: 80, left: 40, right: 40,
      fontFamily: SERIF, color: GOLD, opacity: alpha,
      textShadow: '0 2px 12px rgba(0,0,0,0.6)',
    }}>
      {/* Top left: connection status */}
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}>
        <div>
          <div style={{fontSize: 13, letterSpacing: '0.15em', opacity: 0.6}}>CONNEXION</div>
          <div style={{
            fontSize: 22, fontWeight: 'bold', color: data.connectionColor,
            display: 'flex', alignItems: 'center', gap: 8, marginTop: 2,
          }}>
            <span style={{width: 8, height: 8, borderRadius: 4, background: data.connectionColor, display: 'inline-block'}} />
            {data.connection}
          </div>
          {data.stats.map((s, i) => (
            <div key={i} style={{marginTop: i === 0 ? 12 : 4}}>
              <span style={{fontSize: 12, letterSpacing: '0.12em', opacity: 0.5}}>{s.label} </span>
              <span style={{fontSize: 18}}>{s.value}</span>
            </div>
          ))}
        </div>

        {/* Top right: gauges */}
        <div style={{display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end'}}>
          {wifi > 0.01 && <GaugeBar label="WiFi" level={wifi} color="#48BB78" />}
          {human > 0.01 && <GaugeBar label="❤" level={human} color="#E53E3E" pulse={humanPulse} t={t} />}
        </div>
      </div>
    </div>
  );
};
