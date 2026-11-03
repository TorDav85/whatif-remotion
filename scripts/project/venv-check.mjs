/**
 * Check the Python environment after the project folder has been moved.
 *
 *   npm run venv:check
 *
 * python.exe keeps working (npm scripts call it directly), but pip.exe and other launchers embed the
 * old absolute path, and pyvenv.cfg points to the base Python. Reports what is stale and how to fix it.
 */
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const venv = path.join(root, '.venv');
const win = process.platform === 'win32';
const bin = path.join(venv, win ? 'Scripts' : 'bin');
const python = path.join(bin, win ? 'python.exe' : 'python');
let problems = 0;
const ok = (m) => console.log(`  ✓ ${m}`);
const bad = (m) => { problems++; console.log(`  ! ${m}`); };

if (!fs.existsSync(python)) {
  console.log('Pas de .venv : voir README (Installer) pour le créer.');
  process.exit(1);
}

// Base interpreter referenced by pyvenv.cfg.
const cfg = fs.readFileSync(path.join(venv, 'pyvenv.cfg'), 'utf8');
const home = cfg.match(/^home\s*=\s*(.+)$/m)?.[1].trim();
if (home && fs.existsSync(home)) ok(`Python de base trouvé : ${home}`);
else bad(`Python de base introuvable (${home}) : recréer le .venv`);

// python.exe runs and sees the project's packages.
const run = spawnSync(python, ['-c', 'import sys, TTS, faster_whisper; print(sys.prefix)'], {encoding: 'utf8'});
if (run.status === 0) ok(`python.exe fonctionne (${run.stdout.trim()})`);
else bad(`python.exe ne charge pas les paquets voix : ${run.stderr.trim().split('\n').pop()}`);

// pip launcher: the old absolute path is embedded in the .exe (Windows) or the shebang (Unix).
const pip = path.join(bin, win ? 'pip.exe' : 'pip');
if (fs.existsSync(pip)) {
  const text = fs.readFileSync(pip).toString('latin1');
  const match = text.match(/([A-Za-z]:\\[^\0"\n]*?python\.exe|#!\s*(\/\S+python\S*))/);
  const embedded = match ? (match[1].startsWith('#!') ? match[2] : match[1]) : null;
  if (!embedded) ok('pip : chemin embarqué non détecté (rien à signaler)');
  else if (path.resolve(embedded).toLowerCase() === path.resolve(python).toLowerCase()) ok('pip pointe vers ce .venv');
  else bad(`pip pointe encore vers ${embedded} : utiliser « ${path.relative(root, python)} -m pip … » au lieu de pip`);
}

if (problems) {
  console.log(`\n${problems} problème(s).`);
  console.log(`Lanceurs (pip…) seulement : ${path.relative(root, python)} -m pip install --force-reinstall --no-deps pip`);
  console.log('Sinon, repartir proprement (les modèles restent dans .cache/) :');
  console.log(win
    ? '  Remove-Item -Recurse -Force .venv\n  python -m venv .venv\n  .\\.venv\\Scripts\\python.exe -m pip install torch==2.6.0 torchaudio==2.6.0 --index-url https://download.pytorch.org/whl/cu124\n  .\\.venv\\Scripts\\python.exe -m pip install -r scripts/audio/xtts/requirements.txt'
    : '  rm -rf .venv && python3 -m venv .venv && .venv/bin/python -m pip install -r scripts/audio/xtts/requirements.txt');
} else console.log('\n.venv en bon état.');
process.exitCode = problems ? 1 : 0;
