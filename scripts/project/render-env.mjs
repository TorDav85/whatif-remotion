/**
 * Render settings read from the environment, validated once for every script.
 *
 *   REMOTION_CONCURRENCY  integer >= 1, Chrome tabs rendering in parallel (default 2)
 *   REMOTION_GL           WebGL backend accepted by the installed Remotion (default 'angle')
 *
 * The accepted GL backends come from the installed @remotion/renderer, so the list follows the
 * Remotion version instead of being copied here.
 */
import {RenderInternals} from '@remotion/renderer';

export const DEFAULT_CONCURRENCY = 2;
export const DEFAULT_GL = 'angle';
export const validGl = [...RenderInternals.validOpenGlRenderers];

/** Parses one concurrency value; throws on anything but an integer >= 1. */
export const parseConcurrency = (value, source = 'REMOTION_CONCURRENCY') => {
  const text = String(value).trim();
  if (!/^\d+$/.test(text) || Number(text) < 1) throw new Error(`${source} invalide : « ${value} » (entier >= 1 attendu).`);
  return Number(text);
};

/** Parses a GL backend name; throws if the installed Remotion does not accept it. */
export const parseGl = (value, source = 'REMOTION_GL') => {
  const text = String(value).trim();
  if (!validGl.includes(text)) throw new Error(`${source} invalide : « ${value} » (valeurs acceptées : ${validGl.join(', ')}).`);
  return text;
};

const set = (v) => v !== undefined && v !== '';

/** Values from the environment, or the defaults when unset. */
export const renderEnv = (env = process.env) => ({
  concurrency: set(env.REMOTION_CONCURRENCY) ? parseConcurrency(env.REMOTION_CONCURRENCY) : DEFAULT_CONCURRENCY,
  gl: set(env.REMOTION_GL) ? parseGl(env.REMOTION_GL) : DEFAULT_GL,
});
