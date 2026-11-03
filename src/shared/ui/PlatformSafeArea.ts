/**
 * Safe zones of a 1080×1920 vertical video (TikTok / Shorts / Reels), in pixels.
 * Top: app tabs; right: like/comment buttons; bottom: description and music line.
 */
export const SAFE = {
  top: 300,
  right: 170,
  left: 56,
  bottom: 380,
  /** Captions sit above the description area, below the centre of the frame. */
  captionTop: 1180,
} as const;
