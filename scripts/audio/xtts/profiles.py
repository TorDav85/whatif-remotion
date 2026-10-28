"""Import and select local voice references. Recordings are never committed to Git."""
import argparse
from datetime import datetime, timezone
import json
from pathlib import Path
import re
import subprocess
import sys
import tempfile
from audio import ROOT, duration, project_path

SAMPLES = ROOT / 'voice-samples'
SETTINGS = ROOT / '.cache' / 'voice-settings.json'


def profile_path(name):
    if not re.fullmatch(r'[a-z][a-z0-9-]{0,47}', name):
        raise ValueError('Nom de voix : 1 à 48 lettres minuscules, chiffres ou tirets ; commencer par une lettre.')
    folder = (SAMPLES / name).resolve()
    if folder.parent != SAMPLES.resolve():
        raise ValueError('Le profil doit rester dans voice-samples/.')
    return folder


def get_profile(name):
    folder = profile_path(name)
    if not (folder / 'reference.wav').is_file() or not (folder / 'profile.json').is_file():
        raise ValueError(f'Voix introuvable : {name}. Ajoutez-la avec npm run voice:add -- {name} <audio>.')
    return json.loads((folder / 'profile.json').read_text(encoding='utf-8'))


def add_profile(name, source, start=0, seconds=10, replace=False):
    folder, source = profile_path(name), project_path(source)
    if folder.exists() and not replace:
        raise ValueError(f'La voix {name} existe déjà ; --replace permet son remplacement explicite.')
    if not source.is_file():
        raise ValueError(f'Audio introuvable : {source}')
    SAMPLES.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='.import-', dir=SAMPLES) as temporary:
        sample = Path(temporary) / 'reference.wav'
        result = subprocess.run([sys.executable, str(Path(__file__).with_name('prepare.py')),
                                 str(source), '--output', str(sample), '--start', str(start),
                                 '--seconds', str(seconds)], capture_output=True, text=True, encoding='utf-8')
        if result.returncode:
            raise ValueError(result.stderr.strip() or result.stdout.strip())
        metadata = {'id': name, 'duration': duration(sample), 'sourceName': source.name,
                    'createdAt': datetime.now(timezone.utc).isoformat(), 'sampleRate': 44100}
        folder.mkdir(exist_ok=True)
        sample.replace(folder / 'reference.wav')
        sample.with_suffix('.json').replace(folder / 'reference.json')
        (folder / 'profile.json').write_text(json.dumps(metadata, ensure_ascii=False, indent=2), encoding='utf-8')
    return metadata


def use_profile(name):
    get_profile(name)
    SETTINGS.parent.mkdir(parents=True, exist_ok=True)
    SETTINGS.write_text(json.dumps({'profile': name}), encoding='utf-8')


def resolve_reference(name=None, explicit=None):
    if explicit:
        return project_path(explicit), None
    if name is None and SETTINGS.exists():
        name = json.loads(SETTINGS.read_text(encoding='utf-8')).get('profile')
    if name:
        get_profile(name)
        return profile_path(name) / 'reference.wav', name
    return ROOT / 'public/reference.wav', None


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest='command', required=True)
    add = commands.add_parser('add')
    add.add_argument('name')
    add.add_argument('input')
    add.add_argument('--start', type=float, default=0)
    add.add_argument('--seconds', type=float, default=10)
    add.add_argument('--replace', action='store_true')
    commands.add_parser('list')
    select = commands.add_parser('use')
    select.add_argument('name')
    args = parser.parse_args()
    if args.command == 'add':
        metadata = add_profile(args.name, args.input, args.start, args.seconds, args.replace)
        print(f"Voix ajoutée : {metadata['id']} ({metadata['duration']:.2f} s).")
    elif args.command == 'use':
        use_profile(args.name)
        print(f'Voix active : {args.name}')
    else:
        selected = json.loads(SETTINGS.read_text(encoding='utf-8')).get('profile') if SETTINGS.exists() else None
        profiles = sorted(SAMPLES.glob('*/profile.json')) if SAMPLES.exists() else []
        for file in profiles:
            profile = get_profile(file.parent.name)
            print(f"{'*' if profile['id'] == selected else ' '} {profile['id']} — {profile['duration']:.2f} s")
        if not profiles:
            print('Aucune voix nommée. Ajoutez un audio avec npm run voice:add -- ma-voix <audio>.')


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        print(f'Erreur voix : {error}', file=sys.stderr)
        sys.exit(1)
