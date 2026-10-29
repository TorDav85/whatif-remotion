import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readTimeline, audioFrameWindow, compositionFrames, timelineMetadata, eventOf, eventProgress, speechGain} from '../../src/videos/audio-first-bridge/timeline/runtime.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const data = JSON.parse(fs.readFileSync(path.join(root, 'src/videos/audio-first-bridge/compiled-timeline.json'), 'utf8'));
const timeline = readTimeline(data);

test('all complete media windows fit the actual composition, independently of subtitles', () => {
  const frames = compositionFrames(timeline);
  for (const beat of timeline.beats) {
    const window = audioFrameWindow(beat, timeline.fps);
    assert.ok(window.from + window.durationInFrames <= frames);
    assert.ok(window.durationInFrames / timeline.fps >= beat.audioDuration);
    assert.ok(Math.abs(window.from / timeline.fps - beat.audioStart) <= 0.5 / timeline.fps);
  }
  assert.ok(audioFrameWindow(timeline.beats[1], timeline.fps).from > 0);
});

test('metadata follows changed narrative/visual duration and covers the ending', () => {
  const modified = structuredClone(timeline);
  modified.conclusion.duration += 3;
  modified.conclusion.end += 3;
  modified.usefulEnd += 3;
  modified.duration += 3;
  assert.equal(timelineMetadata(modified).durationInFrames - timelineMetadata(timeline).durationInFrames, 3 * timeline.fps);
  assert.ok(compositionFrames(timeline) / timeline.fps >= timeline.conclusion.end);
});

test('jump forward and back yields the same event state, without playback history', () => {
  const event = eventOf(timeline, 'bridgeCollapse');
  const middle = event.start + event.duration / 2;
  const first = eventProgress(event, middle);
  assert.equal(eventProgress(event, event.end + 10), 1);
  assert.equal(eventProgress(event, event.start - 1), 0);
  assert.equal(eventProgress(event, middle), first);
  assert.ok(Math.abs(first - 0.5) < 1e-12);
});

test('anchored consequence follows the spoken trigger and can finish later', () => {
  const event = eventOf(timeline, 'bridgeCollapse');
  assert.ok(event.start >= event.anchor.wordEnd);
  assert.ok(event.end > timeline.beats.at(-1).speechEnd);
  assert.ok(event.anchor.references.length > 0);
});

test('invalid scenes, duplicate ids, stale references and audio overlaps are rejected', () => {
  for (const mutate of [
    (value) => {value.scene = 'unknown';},
    (value) => {value.events[0].id = value.events[1].id;},
    (value) => {value.events[0].anchor.references[0].wordIndex = 1000;},
    (value) => {value.beats[1].audioStart = 0;},
    (value) => {value.events[0].start += 1; value.events[0].end += 1;},
  ]) {
    const modified = structuredClone(timeline);
    mutate(modified);
    assert.throws(() => readTimeline(modified), /Audio-First/);
  }
});

test('ambience is attenuated during speech and returns after speech', () => {
  const beat = timeline.beats[0];
  assert.ok(speechGain(timeline, (beat.speechStart + beat.speechEnd) / 2) < 1);
  assert.equal(speechGain(timeline, timeline.beats.at(-1).speechEnd + 0.5), 1);
});
