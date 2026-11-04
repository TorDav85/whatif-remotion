/**
 * Render with the shared session and the 3D shot cache (docs/acceleration-rendu.md).
 *
 *   npm run rendu -- BombeNucleaireVille --brouillon                 540×960, out/brouillon/
 *   npm run rendu -- BombeNucleaireVille --brouillon --secondes 8-12 short extract, to check a movement
 *   npm run rendu -- BombeNucleaireVille                              1080×1920, out/rendu/ (after validation)
 *   npm run rendu -- VilleReferenceVisite --images 150-449 --concurrency 3
 *
 * Options: --out fichier.mp4, --sans-cache (plain render), --sans-verif (no check of reused shots),
 * --props JSON, --audio-bitrate 192k, --muet. Compositions without declared shots render normally.
 * A draft and a final have separate caches (not the same size); the final reuses nothing of the draft.
 */
import fs from 'node:fs';
import path from 'node:path';
import {openSession, root} from '../project/render-session.mjs';
import {loadManifests, preparePlans, servePlans} from '../project/plans3d.mjs';

const args = process.argv.slice(2);
// PowerShell drops `--`: npm then keeps the flags as npm_config_*.
const fromNpm = (name) => process.env[`npm_config_${name.replaceAll('-', '_')}`];
const opt = (name) => {
  const i = args.indexOf(`--${name}`);
  if (i >= 0) return args[i + 1];
  const v = fromNpm(name);
  return v && v !== 'true' ? v : undefined;
};
const flag = (name) => args.includes(`--${name}`) || fromNpm(name) === 'true';
const valued = new Set(['out', 'secondes', 'images', 'concurrency', 'props', 'audio-bitrate', 'scale']);
const id = args.find((a, i) => !a.startsWith('--') && !(i > 0 && valued.has(args[i - 1].slice(2))));
if (!id) {
  console.error('Usage : npm run rendu -- <Composition> [--brouillon] [--secondes 8-12 | --images 240-360] [--concurrency 2] [--sans-cache] [--out f.mp4]');
  process.exit(2);
}

const draft = flag('brouillon');
const scale = Number(opt('scale') ?? (draft ? 0.5 : 1));
const concurrency = Number(opt('concurrency') ?? 2);
const useCache = !flag('sans-cache');
const t0 = performance.now();
const session = await openSession();
const server = useCache ? await servePlans() : null;
try {
  const inputProps = opt('props') ? JSON.parse(opt('props')) : {};
  const composition = await session.select(id, inputProps);
  const last = composition.durationInFrames - 1;
  let frameRange = null;
  if (opt('images')) frameRange = opt('images').split('-').map(Number);
  if (opt('secondes')) frameRange = opt('secondes').split('-').map((s) => Math.round(Number(s) * composition.fps));
  if (frameRange) frameRange = [Math.max(0, frameRange[0]), Math.min(last, frameRange[1] ?? last)];
  const suffix = frameRange ? `-${frameRange[0]}-${frameRange[1]}` : '';
  const output = path.resolve(root, opt('out') ?? path.join('out', draft ? 'brouillon' : 'rendu', `${id}${suffix}.mp4`));
  fs.mkdirSync(path.dirname(output), {recursive: true});
  console.log(`${id} : ${draft ? 'brouillon' : 'final'} ${Math.round(composition.width * scale)}×${Math.round(composition.height * scale)}, ` +
    `${frameRange ? `images ${frameRange[0]}–${frameRange[1]}` : `${composition.durationInFrames} images`}, concurrency ${concurrency}`);

  let props = composition.props;
  let plans = null;
  if (useCache) {
    const prepared = await preparePlans({session, composition, manifests: await loadManifests(), scale, frameRange, concurrency,
      verify: !flag('sans-verif'), baseUrl: server.url});
    if (prepared) {
      plans = prepared.stats;
      props = {...props, __plans3d: prepared.segments};
      console.log(`Plans 3D : ${plans.reused} réutilisé(s), ${plans.rendered} calculé(s) (${plans.framesRendered} images) en ${(plans.ms / 1000).toFixed(1)} s`);
    } else {
      console.log('Pas de plans 3D déclarés (src/core/plans3d-manifests.ts) : rendu direct.');
    }
  }
  const started = performance.now();
  let lastShown = -1;
  await session.media(composition, {
    codec: 'h264', inputProps: props, outputLocation: output, concurrency, scale, frameRange, overwrite: true,
    crf: draft ? 23 : 18, muted: flag('muet'), audioBitrate: opt('audio-bitrate') ?? null,
    onProgress: ({progress}) => {
      const p = Math.floor(progress * 10);
      if (p !== lastShown) {
        lastShown = p;
        process.stdout.write(`${p * 10} % `);
      }
    },
  });
  const composite = (performance.now() - started) / 1000;
  const total = (performance.now() - t0) / 1000;
  console.log(`\n→ ${path.relative(root, output)} en ${total.toFixed(1)} s (session ${(session.timings.bundleMs / 1000).toFixed(1)} s, ` +
    `${plans ? `3D ${(plans.ms / 1000).toFixed(1)} s, ` : ''}assemblage ${composite.toFixed(1)} s)`);
  fs.writeFileSync(output.replace(/\.mp4$/, '.rendu.json'), JSON.stringify({id, draft, scale, frameRange, concurrency, cache: useCache,
    session: session.timings, compiled: session.compiled, plans, compositeSeconds: +composite.toFixed(1), totalSeconds: +total.toFixed(1)}, null, 2));
} finally {
  await server?.close();
  await session.close();
}
