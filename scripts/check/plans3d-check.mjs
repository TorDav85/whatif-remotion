/**
 * Proof that the 3D shot cache changes no image: the same frames rendered directly and through the
 * cache (3D images + live overlays), compared pixel by pixel.
 *
 *   npm run plans3d:check -- VilleReferenceVisite:300,1200 BombeNucleaireVille:400,1500
 *   npm run plans3d:check -- BombeNucleaireVille:400 --scale 0.5
 */
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {openSession, root} from '../project/render-session.mjs';
import {loadManifests, preparePlans, servePlans} from '../project/plans3d.mjs';

const args = process.argv.slice(2);
const si = args.indexOf('--scale');
const scale = si >= 0 ? Number(args.splice(si, 2)[1]) : Number(process.env.npm_config_scale ?? 1);
const specs = args.filter((a) => !a.startsWith('--'));
if (!specs.length) {
  console.error('Usage : npm run plans3d:check -- Composition:image,image … [--scale 0.5]');
  process.exit(2);
}
const outDir = path.join(root, 'out', 'plans3d-check');
const session = await openSession();
const manifests = await loadManifests();
const server = await servePlans();
const names = [];
try {
  for (const spec of specs) {
    const [id, list] = spec.split(':');
    const frames = list.split(',').map(Number);
    const composition = await session.select(id);
    const write = (label) => (buf, f) => {
      const file = path.join(outDir, label, `${id}-${f}.png`);
      fs.mkdirSync(path.dirname(file), {recursive: true});
      fs.writeFileSync(file, buf);
    };
    const common = {frames, imageFormat: 'png', outputDir: null, scale, muted: true, onStart: () => undefined, onFrameUpdate: () => undefined};
    await session.frames(composition, {...common, onFrameBuffer: write('avant')});
    const prepared = await preparePlans({session, composition, manifests, frames, scale, baseUrl: server.url});
    if (!prepared) throw new Error(`${id} n’a pas de plans déclarés dans src/core/plans3d-manifests.ts`);
    console.log(`${id} : ${prepared.stats.plans} plan(s), ${prepared.stats.reused} réutilisé(s), ${prepared.stats.framesRendered} image(s) 3D calculée(s)`);
    await session.frames(composition, {...common, inputProps: {...composition.props, __plans3d: prepared.segments}, onFrameBuffer: write('apres')});
    names.push(...frames.map((f) => `${id}-${f}.png`));
  }
} finally {
  await server.close();
  await session.close();
}
const r = spawnSync(process.execPath, [path.join(root, 'scripts/audio/python.mjs'), 'scripts/check/compare_images.py', outDir, ...names], {cwd: root, stdio: 'inherit'});
process.exitCode = r.status ?? 1;
