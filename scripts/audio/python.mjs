import {existsSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const python = path.join(root, '.venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');
if (!existsSync(python)) {
  console.error('Créez .venv et installez scripts/audio/xtts/requirements.txt (voir README).');
  process.exit(1);
}
const result = spawnSync(python, process.argv.slice(2), {cwd: root, stdio: 'inherit', env: {...process.env, PYTHONUTF8: '1'}});
if (result.error) console.error(result.error.message);
process.exit(result.status ?? 1);
