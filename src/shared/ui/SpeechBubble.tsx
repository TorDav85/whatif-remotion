import React from 'react';
import {SAFE} from './PlatformSafeArea';

const SERIF = 'Georgia, "Times New Roman", serif';
const WIDTH = 1080;

/**
 * Dialogue bubble whose tail points at a screen anchor (a character's head, from projectToScreen).
 * The bubble sits above the head and stays inside the platform safe area.
 */
export const SpeechBubble: React.FC<{anchor: {x: number; y: number}; text: string; alpha: number; gap?: number; maxWidth?: number}> = ({
  anchor, text, alpha, gap = 34, maxWidth = 420,
}) => {
  if (alpha <= 0) return null;
  const half = maxWidth / 2;
  const left = Math.min(WIDTH - SAFE.right - maxWidth, Math.max(SAFE.left, anchor.x - half));
  const bottom = Math.max(SAFE.top + 60, anchor.y - gap);
  // Tail: from the bubble's lower edge towards the head, clamped under the bubble.
  const tailX = Math.min(left + maxWidth - 30, Math.max(left + 30, anchor.x));
  return (
    <div style={{position: 'absolute', inset: 0, opacity: alpha, pointerEvents: 'none'}}>
      <div style={{
        position: 'absolute', left, top: bottom, transform: `translateY(-100%) translateY(${(1 - alpha) * 10}px)`,
        width: maxWidth, display: 'flex', justifyContent: 'center',
      }}>
        <div style={{
          background: 'rgba(255,255,255,0.94)', borderRadius: 18, padding: '12px 20px',
          fontFamily: SERIF, fontSize: 26, color: '#1A202C', textAlign: 'center', whiteSpace: 'nowrap',
          boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
        }}>
          « {text} »
        </div>
      </div>
      <svg style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}} width={1} height={1}>
        <path d={`M ${tailX - 12} ${bottom - 2} L ${tailX + 12} ${bottom - 2} L ${anchor.x} ${Math.max(bottom + 14, anchor.y - 6)} Z`}
          fill="rgba(255,255,255,0.94)" />
      </svg>
    </div>
  );
};
