import {existsSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
// WHATIF_VENV: another checkout's .venv (a worktree without a junction to the main folder).
const venv = process.env.WHATIF_VENV ? path.resolve(process.env.WHATIF_VENV) : path.join(root, '.venv');
const python = path.join(venv, process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');
if (!existsSync(python)) {
  console.error('Créez .venv et installez scripts/audio/xtts/requirements.txt (voir README).');
  process.exit(1);
}
const result = spawnSync(python, process.argv.slice(2), {cwd: root, stdio: 'inherit', env: {...process.env, PYTHONUTF8: '1'}});
if (result.error) console.error(result.error.message);
process.exit(result.status ?? 1);
