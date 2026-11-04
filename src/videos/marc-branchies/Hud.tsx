import React from 'react';
import {smooth} from '../../core/animation';
import {SERIF} from '../../shared/ui/tokens';
import {BATH, COLD, FISH, HEAVY, HYPO, LITRES, OXYGEN, PUNCH, SWIM, bodyTempAt, oxygenAt} from './Scene3D';

const GOLD = '#F6E05E';
const RED = '#FF6B6B';
const BLUE = '#8FD0FF';

/** Same safe zone as the other Marc videos: below the app tabs, left of the buttons. */
export const HUD_TOP = 300;

const statAt = (t: number): [string, string, string?, string?] | null => {
  if (t < LITRES) return ["OXYGÈNE DANS 1 LITRE", 'AIR ≈ 270 mg', 'EAU ≈ 9 mg'];
  if (t < BATH) return ['EAU À FILTRER', '≈ 50 L / MIN', 'AU REPOS'];
  if (t < HEAVY) return ['BAIGNOIRE ≈ 150 L', `${Math.min(3, Math.floor(3 * smooth(BATH + 0.6, HEAVY - 1, t) + 0.0001))} / 3 MIN`, 'ACCÉLÉRÉ'];
  if (t < SWIM) return ["L'EAU PÈSE", '× 800', "PLUS QUE L'AIR"];
  if (t < COLD) return ['OXYGÈNE NÉCESSAIRE', '× 10', 'EN NAGEANT', oxygenAt(t) < 0.4 ? RED : undefined];
  if (t < HYPO) return ['SANG SORTANT DES BRANCHIES', '≈ 15 °C', "= L'EAU", BLUE];
  if (t < FISH) return ['CORPS', `${bodyTempAt(t).toFixed(1).replace('.', ',')} °C ↓`, 'ILLUSTRATION · HEURE APRÈS HEURE', BLUE];
  if (t < PUNCH) return ['POISSON', "= TEMP. DE L'EAU", 'SANG FROID'];
  return null;
};

export const Hud: React.FC<{t: number}> = ({t}) => {
  const alpha = smooth(OXYGEN + 0.3, OXYGEN + 0.9, t) * (1 - smooth(PUNCH - 0.4, PUNCH, t));
  if (alpha <= 0) return null;
  const stat = statAt(t);
  if (!stat) return null;
  const swimming = t >= SWIM && t < COLD;
  return (
    <div style={{
      position: 'absolute', top: HUD_TOP, left: 56, right: 176,
      fontFamily: SERIF, color: GOLD, opacity: alpha,
      textShadow: '0 2px 12px rgba(0,0,0,0.85)',
    }}>
      <div style={{fontSize: 21, letterSpacing: '0.16em', opacity: 0.8}}>{stat[0]}</div>
      <div style={{fontSize: stat[1].length > 12 ? 46 : 62, fontWeight: 'bold', color: stat[3] ?? '#fff', lineHeight: 1.05, fontVariantNumeric: 'tabular-nums'}}>{stat[1]}</div>
      {stat[2] && <div style={{fontSize: 24, marginTop: 4}}>{stat[2]}</div>}
      {swimming && (
        <div style={{marginTop: 14, width: 360, height: 26, border: '3px solid #fff', borderRadius: 14, overflow: 'hidden'}}>
          <div style={{width: `${100 * oxygenAt(t)}%`, height: '100%', background: oxygenAt(t) < 0.4 ? RED : '#7CFC8A'}} />
        </div>
      )}
    </div>
  );
};
