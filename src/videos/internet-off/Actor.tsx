import React from 'react';
import {Block} from '../../assets/kit';

export type Look = {shirt: string; pants: string; skin: string; hair: string; shoes?: string; hairStyle?: 'court' | 'long' | 'chauve'};

export type ActorProps = {
  look: Look;
  /** 0 = still, 1 = full walk cycle */
  walk?: number;
  phase?: number;
  sit?: 'chair' | 'ground';
  /** upper-body lean: negative = forward */
  bend?: number;
  /** negative = looking down */
  headPitch?: number;
  headYaw?: number;
  /** [pitch, roll]: positive pitch raises the arm forward, positive roll moves it outward */
  armL?: [number, number];
  armR?: [number, number];
  phone?: 'none' | 'on' | 'off';
  /** 0 = neutral, 1 = smile, 2 = open laugh */
  smile?: number;
  pocketPhone?: boolean;
  /** blue screen light on the face */
  glow?: number;
  scale?: number;
};

const MOUTH = '#5a2626';

/** Blocky character with a readable face; origin at the feet, facing -z. */
export const Actor: React.FC<ActorProps> = ({
  look, walk = 0, phase = 0, sit, bend = 0, headPitch = 0, headYaw = 0,
  armL = [0, 0], armR = [0, 0], phone = 'none', smile = 0, pocketPhone, glow = 0, scale = 1,
}) => {
  const shoes = look.shoes ?? '#1d1d1f';
  const hip = sit === 'chair' ? 0.48 : sit === 'ground' ? 0.16 : 0.9;
  const swing = Math.sin(phase) * 0.5 * walk;
  const bob = Math.abs(Math.cos(phase)) * 0.04 * walk;
  const legPitch = sit ? Math.PI / 2 : 0;
  const legRoll = sit === 'ground' ? 0.45 : 0;
  const holding = phone !== 'none';
  const pitchL = armL[0] - swing * 0.8;
  const pitchR = armR[0] + (holding ? 0 : swing * 0.8);
  const laugh = Math.max(0, smile - 1);
  const grin = Math.min(1, smile);

  const leg = (side: number, s: number) => (
    <group key={side} position={[side * 0.1, hip, 0]} rotation={[legPitch + s, 0, side * legRoll]}>
      <Block p={[0, -0.42, 0]} s={[0.15, 0.84, 0.17]} c={look.pants} />
      <Block p={[0, -0.86, -0.05]} s={[0.16, 0.1, 0.27]} c={shoes} />
    </group>
  );

  const arm = (side: number, pitch: number, roll: number) => (
    <group key={side} position={[side * 0.27, 0.55, 0]} rotation={[pitch, 0, side * (0.06 + roll)]}>
      <Block p={[0, -0.27, 0]} s={[0.11, 0.56, 0.13]} c={look.shirt} />
      <Block p={[0, -0.6, 0]} s={[0.1, 0.12, 0.11]} c={look.skin} />
      {side > 0 && holding && (
        <group position={[0, -0.64, -0.04]} rotation={[0.9 - pitch, 0, 0]}>
          <Block p={[0, 0, 0]} s={[0.075, 0.012, 0.15]} c="#141518" />
          <Block p={[0, 0.008, 0]} s={[0.064, 0.004, 0.13]} c={phone === 'on' ? '#8fcfff' : '#0b0d10'}
            e={phone === 'on' ? '#6cb4ee' : undefined} ei={phone === 'on' ? 1.6 : 0} />
        </group>
      )}
    </group>
  );

  return (
    <group scale={scale} position={[0, bob, 0]}>
      {leg(-1, swing)}
      {leg(1, -swing)}
      {pocketPhone && <Block p={[0.09, hip - 0.12, 0.095]} s={[0.075, 0.15, 0.02]} c="#141518" />}
      <group position={[0, hip, 0]} rotation={[bend, 0, 0]}>
        <Block p={[0, 0.31, 0]} s={[0.44, 0.62, 0.25]} c={look.shirt} />
        {arm(-1, pitchL, armL[1])}
        {arm(1, pitchR, armR[1])}
        <group position={[0, 0.8, 0]} rotation={[headPitch, headYaw, 0]}>
          <Block p={[0, 0, 0]} s={[0.25, 0.27, 0.25]} c={look.skin} e={glow > 0 ? '#5a9ae0' : undefined} ei={glow * 0.55} />
          {[-1, 1].map((s) => (
            <React.Fragment key={s}>
              <Block p={[s * 0.055, 0.025, -0.127]} s={[0.04, laugh > 0.3 ? 0.015 : 0.045, 0.01]} c="#20160f" />
              <Block p={[s * 0.058, 0.075 + grin * 0.01, -0.127]} s={[0.06, 0.016, 0.01]} c={look.hair} />
              {grin > 0.3 && <Block p={[s * 0.085, -0.035, -0.126]} s={[0.04, 0.025, 0.008]} c="#e3907f" o={grin * 0.7} />}
            </React.Fragment>
          ))}
          <Block p={[0, -0.065 + grin * 0.005, -0.127]} s={[0.07 + grin * 0.04, 0.016 + laugh * 0.04, 0.01]} c={MOUTH} />
          {grin > 0.3 && [-1, 1].map((s) => (
            <Block key={`c${s}`} p={[s * (0.05 + grin * 0.012), -0.055, -0.127]} s={[0.018, 0.018, 0.01]} c={MOUTH} />
          ))}
          {look.hairStyle !== 'chauve' && <Block p={[0, 0.15, 0.01]} s={[0.27, 0.07, 0.27]} c={look.hair} />}
          {look.hairStyle !== 'chauve' && <Block p={[0, 0.06, 0.11]} s={[0.27, 0.16, 0.06]} c={look.hair} />}
          {look.hairStyle === 'long' && <Block p={[0, -0.08, 0.11]} s={[0.28, 0.4, 0.08]} c={look.hair} />}
        </group>
      </group>
    </group>
  );
};

/** Yaw that makes an actor at `from` face `to` (actors face -z). */
export const faceTo = (from: [number, number], to: [number, number]) => Math.atan2(-(to[0] - from[0]), -(to[1] - from[1]));
