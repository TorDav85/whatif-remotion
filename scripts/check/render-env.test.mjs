import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_CONCURRENCY, DEFAULT_GL, parseConcurrency, parseGl, renderEnv, validGl} from '../project/render-env.mjs';

test('defaults when the variables are unset or empty', () => {
  assert.deepEqual(renderEnv({}), {concurrency: DEFAULT_CONCURRENCY, gl: DEFAULT_GL});
  assert.deepEqual(renderEnv({REMOTION_CONCURRENCY: '', REMOTION_GL: ''}), {concurrency: 2, gl: 'angle'});
});

test('valid values are kept', () => {
  assert.deepEqual(renderEnv({REMOTION_CONCURRENCY: '4', REMOTION_GL: 'swangle'}), {concurrency: 4, gl: 'swangle'});
  assert.equal(parseConcurrency(' 1 '), 1);
});

test('invalid concurrency is refused', () => {
  for (const bad of ['0', '-1', '1.5', 'abc', '2,3']) assert.throws(() => parseConcurrency(bad), /entier >= 1/);
});

test('GL backends follow the installed Remotion', () => {
  assert.ok(validGl.includes('angle') && validGl.includes('swangle'));
  assert.throws(() => parseGl('opengl'), /valeurs acceptées/);
});
