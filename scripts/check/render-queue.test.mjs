import test from 'node:test';
import assert from 'node:assert/strict';
import {checkProbe, insideOut, isTransient, parseJobs, pool, selectVideos} from '../project/render-queue.mjs';

const catalog = [
  {slug: 'a', id: 'A', output: 'out/a.mp4'},
  {slug: 'b', id: 'B', output: 'out/sub/b.mp4'},
  {slug: 'c', id: 'C', output: 'out/a.mp4'},
  {slug: 'evil', id: 'E', output: '../evil.mp4'},
];

test('RENDER_JOBS: 1 to 4, default 1', () => {
  assert.equal(parseJobs(undefined), 1);
  assert.equal(parseJobs(''), 1);
  assert.equal(parseJobs('4'), 4);
  for (const bad of ['0', '5', '1.5', 'x', '-1']) assert.throws(() => parseJobs(bad), /1 à 4/);
});

test('outputs must stay inside out/', () => {
  assert.ok(insideOut('out/x/y.mp4').endsWith('y.mp4'));
  for (const bad of ['out', '../out/x.mp4', 'public/x.mp4', 'out/../x.mp4']) assert.throws(() => insideOut(bad), /hors de out/);
});

test('selection by slug: order kept, duplicates merged, unknown and shared outputs refused', () => {
  assert.deepEqual(selectVideos(catalog, ['b', 'a', 'b']).map((v) => v.slug), ['b', 'a']);
  assert.throws(() => selectVideos(catalog, ['zz']), /Vidéo inconnue : zz/);
  assert.throws(() => selectVideos(catalog, ['a', 'c']), /même fichier/);
  assert.throws(() => selectVideos(catalog, ['evil']), /hors de out/);
  assert.throws(() => selectVideos(catalog, ['a'], true), /incompatibles/);
  assert.throws(() => selectVideos(catalog, []), /Aucune vidéo/);
});

test('only browser and connection failures are transient', () => {
  for (const msg of ['Target closed', 'Protocol error (Runtime.callFunctionOn): Session closed', 'Browser has disconnected',
    'A delayRender() was called but not cleared after 28000ms. Timeout', 'read ECONNRESET']) assert.ok(isTransient(new Error(msg)), msg);
  for (const msg of ['Could not find composition with ID X', 'fichier rendu vide ou absent', 'ENOENT: no such file']) assert.ok(!isTransient(new Error(msg)), msg);
});

const expected = {width: 1080, height: 1920, fps: 30, duration: 4, audio: true};
const probe = (streams, duration = '4.000000') => ({streams, format: {duration, size: '100'}});
const video = {codec_type: 'video', width: 1080, height: 1920, duration: '4.000000'};
const audio = {codec_type: 'audio', duration: '4.021333'};

test('FFprobe check: duration, size, video and audio tracks', () => {
  assert.deepEqual(checkProbe(probe([video, audio]), expected), []);
  assert.deepEqual(checkProbe(probe([video]), {...expected, audio: false}), []);
  assert.match(checkProbe(probe([video]), expected).join(), /piste audio absente/);
  assert.match(checkProbe(probe([audio]), expected).join(), /aucune piste vidéo/);
  assert.match(checkProbe(probe([{...video, width: 540, height: 960}, audio]), expected).join(), /taille 540x960/);
  assert.match(checkProbe(probe([{...video, duration: '3.5'}, audio]), expected).join(), /durée vidéo 3.5/);
  assert.deepEqual(checkProbe(probe([{...video, duration: '4.033333'}, audio]), expected), [], 'one frame of tolerance');
});

test('pool keeps order and never exceeds the job count', async () => {
  let running = 0;
  let peak = 0;
  const out = await pool([5, 1, 3, 2, 4], 2, async (n) => {
    running++;
    peak = Math.max(peak, running);
    await new Promise((r) => setTimeout(r, n * 5));
    running--;
    return n * 10;
  });
  assert.deepEqual(out, [50, 10, 30, 20, 40]);
  assert.equal(peak, 2);
});
