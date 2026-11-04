/**
 * Production render queue for the videos of src/videos/catalog.json.
 *
 *   npm run render:queue -- nature gravity           render these slugs to their catalog output
 *   npm run render:queue -- --all                     every video of the catalog
 *   npm run render:queue -- heat --overwrite          replace an existing deliverable
 *   npm run render:queue -- --all --dry-run           show the plan, render nothing
 *
 *   RENDER_JOBS=2 REMOTION_CONCURRENCY=2 REMOTION_GL=angle npm run render:queue -- nature heat
 *
 * - The project is prepared once (node scripts/project/video.mjs prepare: validation, registry,
 *   ambiences), before any job: no job writes to the catalog, the registry or the caches.
 * - One bundle for the whole campaign (render-session cache); each attempt opens its own browser.
 * - RENDER_JOBS (1 to 4, default 1) videos in parallel; REMOTION_CONCURRENCY tabs per video.
 * - Each video renders to a hidden partial file next to its output, is checked (not empty, then
 *   FFprobe: duration, size, video track, audio track when the scenario has audio), then moved into
 *   place. An existing deliverable is never replaced without --overwrite (the video is skipped).
 * - One retry at most, only for transient errors (browser crash or disconnect, timeout).
 * - Report: out/queue-reports/<date>.json. Exit code 1 if any job failed.
 */
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath, pathToFileURL} from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const root = path.resolve(here, '../..');
const outDir = path.join(root, 'out');
const cli = path.join(root, 'node_modules/@remotion/cli/remotion-cli.js');

export const parseJobs = (value) => {
  if (value === undefined || value === '') return 1;
  const text = String(value).trim();
  if (!/^\d+$/.test(text) || Number(text) < 1 || Number(text) > 4) throw new Error(`RENDER_JOBS invalide : « ${value} » (entier de 1 à 4 attendu).`);
  return Number(text);
};

/** Resolves a path relative to the project and refuses anything outside out/. */
export const insideOut = (relative) => {
  const resolved = path.resolve(root, relative);
  const rel = path.relative(outDir, resolved);
  if (!rel || rel === '..' || rel.startsWith(`..${path.sep}`) || path.isAbsolute(rel)) throw new Error(`Sortie hors de out/ : ${relative}`);
  return resolved;
};

/** Catalog entries for the requested slugs, in the order given; unknown slugs and shared outputs are refused. */
export const selectVideos = (catalog, slugs, all = false) => {
  if (all && slugs.length) throw new Error('--all et une liste de slugs sont incompatibles.');
  const items = all ? catalog : [...new Set(slugs)].map((slug) => {
    const item = catalog.find((entry) => entry.slug === slug);
    if (!item) throw new Error(`Vidéo inconnue : ${slug} (slugs : ${catalog.map((e) => e.slug).join(', ')}).`);
    return item;
  });
  if (!items.length) throw new Error('Aucune vidéo demandée.');
  const seen = new Map();
  for (const item of items) {
    const output = insideOut(item.output);
    if (seen.has(output)) throw new Error(`${item.slug} et ${seen.get(output)} écrivent le même fichier : ${item.output}`);
    seen.set(output, item.slug);
  }
  return items;
};

/** Errors worth one more attempt: the browser or the connection failed, not the project. */
export const isTransient = (error) => /target closed|session closed|browser has disconnected|protocol error|crash|timed? ?out|timeout|ECONNRESET|EPIPE|net::ERR_/i
  .test(String(error?.stack ?? error?.message ?? error));

/** Problems found in an FFprobe result; an empty list means the file is valid. */
export const checkProbe = (probe, expected) => {
  const problems = [];
  const streams = probe?.streams ?? [];
  const video = streams.find((s) => s.codec_type === 'video');
  const audio = streams.find((s) => s.codec_type === 'audio');
  if (!video) problems.push('aucune piste vidéo');
  else {
    if (video.width !== expected.width || video.height !== expected.height) problems.push(`taille ${video.width}x${video.height} au lieu de ${expected.width}x${expected.height}`);
    const duration = Number(video.duration ?? probe?.format?.duration);
    const tolerance = 1 / expected.fps + 0.01;
    if (!Number.isFinite(duration) || Math.abs(duration - expected.duration) > tolerance) {
      problems.push(`durée vidéo ${duration} s au lieu de ${expected.duration.toFixed(3)} s`);
    }
  }
  if (expected.audio && !audio) problems.push('piste audio absente alors que le scénario a du son');
  return problems;
};

const ffprobe = (file) => {
  const r = spawnSync(process.execPath, [cli, 'ffprobe', '-v', 'error', '-print_format', 'json',
    '-show_entries', 'format=duration,size:stream=codec_type,codec_name,width,height,duration', file], {cwd: root, encoding: 'utf8'});
  if (r.status !== 0) throw new Error(`FFprobe a échoué (${r.status}) : ${r.stderr.trim()}`);
  return JSON.parse(r.stdout);
};

const summary = (probe) => ({
  durationSeconds: Number(probe.format?.duration),
  bytes: Number(probe.format?.size),
  streams: (probe.streams ?? []).map(({codec_type, codec_name, width, height, duration}) => ({codec_type, codec_name, width, height, duration: Number(duration)})),
});

const readJson = (file) => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));

/** Moves the checked partial file into place; without overwrite, fails if the output appeared meanwhile. */
const publish = (partial, output, overwrite) => {
  if (overwrite) fs.renameSync(partial, output);
  else {
    fs.linkSync(partial, output); // EEXIST if a file appeared since the start: never replaced.
    fs.unlinkSync(partial);
  }
};

async function renderOne({item, serveUrl, gl, concurrency, overwrite, renderer, log}) {
  const output = insideOut(item.output);
  const job = {slug: item.slug, id: item.id, output: path.relative(root, output).replaceAll('\\', '/'), status: 'pending', attempts: []};
  if (fs.existsSync(output) && !overwrite) {
    job.status = 'skipped';
    job.reason = 'livrable existant (utiliser --overwrite pour le remplacer)';
    log(`${item.slug} : ${job.output} existe déjà, ignoré.`);
    return job;
  }
  const config = readJson(item.config);
  const expectAudio = Boolean(config.audio?.music || config.audio?.voice);
  fs.mkdirSync(path.dirname(output), {recursive: true});
  const partial = path.join(path.dirname(output), `.${path.basename(output, '.mp4')}.partial-${process.pid}.mp4`);
  for (let attempt = 1; attempt <= 2; attempt++) {
    const started = performance.now();
    const record = {attempt};
    job.attempts.push(record);
    let browser = null;
    try {
      const chromiumOptions = {gl};
      browser = await renderer.openBrowser('chrome', {chromiumOptions, logLevel: 'error'});
      const common = {serveUrl, puppeteerInstance: browser, chromiumOptions, logLevel: 'error'};
      const composition = await renderer.selectComposition({...common, id: item.id});
      log(`${item.slug} : rendu de ${composition.id} (${composition.durationInFrames} images, essai ${attempt})…`);
      await renderer.renderMedia({...common, composition, inputProps: composition.props, codec: 'h264', concurrency, outputLocation: partial, overwrite: true});
      const seconds = (performance.now() - started) / 1000;
      Object.assign(record, {seconds: +seconds.toFixed(1), msPerFrame: Math.round((seconds / composition.durationInFrames) * 1000)});
      const size = fs.existsSync(partial) ? fs.statSync(partial).size : 0;
      if (size === 0) throw new Error('fichier rendu vide ou absent');
      const probe = ffprobe(partial);
      job.probe = summary(probe);
      const problems = checkProbe(probe, {width: composition.width, height: composition.height, fps: composition.fps,
        duration: composition.durationInFrames / composition.fps, audio: expectAudio});
      if (problems.length) throw Object.assign(new Error(`contrôle FFprobe : ${problems.join(' ; ')}`), {validation: true});
      publish(partial, output, overwrite);
      Object.assign(job, {status: 'ok', frames: composition.durationInFrames, seconds: record.seconds, msPerFrame: record.msPerFrame});
      log(`${item.slug} : ok → ${job.output} (${record.seconds} s, ${record.msPerFrame} ms/image)`);
      return job;
    } catch (error) {
      record.error = error.message;
      const retry = attempt === 1 && !error.validation && isTransient(error);
      record.transient = retry;
      log(`${item.slug} : échec essai ${attempt} — ${error.message}${retry ? ' (erreur transitoire : nouvel essai)' : ''}`);
      if (!retry) {
        job.status = 'failed';
        job.error = error.message;
        return job;
      }
    } finally {
      await browser?.close({silent: true}).catch(() => undefined);
      fs.rmSync(partial, {force: true});
    }
  }
  return job;
}

/** Runs the jobs with at most `jobs` videos at a time, keeping the request order in the result. */
export const pool = async (items, jobs, work) => {
  const results = new Array(items.length);
  let next = 0;
  const lane = async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await work(items[i], i);
    }
  };
  await Promise.all(Array.from({length: Math.min(jobs, items.length)}, lane));
  return results;
};

async function main() {
  const args = process.argv.slice(2);
  const fromNpm = (name) => process.env[`npm_config_${name.replaceAll('-', '_')}`] === 'true'; // PowerShell drops `--`
  const flag = (name) => args.includes(`--${name}`) || fromNpm(name);
  const unknown = args.filter((a) => a.startsWith('--') && !['--all', '--overwrite', '--dry-run'].includes(a));
  if (unknown.length) throw new Error(`Option inconnue : ${unknown.join(' ')} (options : --all, --overwrite, --dry-run).`);
  const slugs = args.filter((a) => !a.startsWith('--'));
  const all = flag('all');
  if (!slugs.length && !all) {
    console.error('Usage : npm run render:queue -- <slug...> | --all [--overwrite] [--dry-run]');
    process.exitCode = 2;
    return;
  }
  const {renderEnv} = await import('./render-env.mjs');
  const env = renderEnv();
  const jobs = parseJobs(process.env.RENDER_JOBS);
  const overwrite = flag('overwrite');
  const videos = selectVideos(readJson('src/videos/catalog.json'), slugs, all);
  const settings = {jobs, concurrency: env.concurrency, gl: env.gl, overwrite};
  console.log(`File : ${videos.map((v) => v.slug).join(', ')} — ${jobs} vidéo(s) à la fois, concurrence ${env.concurrency}, GL ${env.gl}${overwrite ? ', écrasement autorisé' : ''}`);
  if (flag('dry-run')) {
    for (const v of videos) console.log(`  ${v.slug.padEnd(14)} ${v.id.padEnd(20)} → ${v.output}${fs.existsSync(insideOut(v.output)) ? (overwrite ? ' (sera remplacé)' : ' (existe : ignoré)') : ''}`);
    return;
  }

  const started = new Date();
  const prep = spawnSync(process.execPath, [path.join(root, 'scripts/project/video.mjs'), 'prepare'], {cwd: root, stdio: 'inherit'});
  if (prep.status !== 0) throw new Error(`Préparation du projet échouée (${prep.status ?? prep.error?.message}) : aucun rendu lancé.`);
  const {cachedBundle} = await import('./render-session.mjs');
  const bundle = await cachedBundle();
  const renderer = await import('@remotion/renderer');
  const results = await pool(videos, jobs, (item) => renderOne({item, serveUrl: bundle.serveUrl, gl: env.gl, concurrency: env.concurrency,
    overwrite, renderer, log: (line) => console.log(line)}));

  const counts = Object.fromEntries(['ok', 'skipped', 'failed'].map((s) => [s, results.filter((r) => r.status === s).length]));
  const report = {startedAt: started.toISOString(), finishedAt: new Date().toISOString(),
    totalSeconds: +((Date.now() - started.getTime()) / 1000).toFixed(1), settings,
    env: {RENDER_JOBS: process.env.RENDER_JOBS ?? null, REMOTION_CONCURRENCY: process.env.REMOTION_CONCURRENCY ?? null, REMOTION_GL: process.env.REMOTION_GL ?? null},
    bundle: {hash: bundle.hash, compiled: bundle.compiled, ms: bundle.ms}, counts, jobs: results};
  const reportFile = path.join(outDir, 'queue-reports', `${started.toISOString().replaceAll(':', '-').replace(/\.\d+Z$/, 'Z')}.json`);
  fs.mkdirSync(path.dirname(reportFile), {recursive: true});
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2) + '\n');
  console.log(`\n${counts.ok} ok, ${counts.skipped} ignorée(s), ${counts.failed} échec(s) en ${report.totalSeconds} s — rapport : ${path.relative(root, reportFile)}`);
  if (counts.failed) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
