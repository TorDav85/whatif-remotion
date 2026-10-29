"""Preflight the published Audio-First timeline against source JSON and measured WAV files."""
import argparse
import hashlib
import json
from pathlib import Path
import sys
import wave

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / 'scripts/audio/xtts'))
from audio import duration


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--compiled', default='src/videos/audio-first-bridge/compiled-timeline.json')
    args = parser.parse_args()
    timeline = json.loads((ROOT / args.compiled).read_text(encoding='utf-8'))
    source = json.loads((ROOT / timeline['sourceScript']).read_text(encoding='utf-8-sig'))
    signature = hashlib.sha256(json.dumps(source, ensure_ascii=False, sort_keys=True, separators=(',', ':')).encode()).hexdigest()
    if signature != timeline['sourceSha256']:
        raise ValueError('Le script narratif a changé : relancez npm run audio:first avant le rendu.')
    for beat in timeline['beats']:
        path = (ROOT / 'public' / beat['audioFile']).resolve()
        if not path.is_relative_to((ROOT / 'public').resolve()) or not path.is_file():
            raise ValueError(f'Fichier audio absent ou hors de public : {beat["audioFile"]}')
        if hashlib.sha256(path.read_bytes()).hexdigest() != beat['audioSha256']:
            raise ValueError(f'Audio modifié : {beat["id"]}. Régénérez l’alignement et la timeline.')
        if abs(duration(path) - beat['audioDuration']) > 1 / 24000:
            raise ValueError(f'Durée mesurée incohérente : {beat["id"]}')
        if beat['audioStart'] + beat['audioDuration'] > timeline['duration']:
            raise ValueError(f'Fichier tronqué par la composition : {beat["id"]}')
    ambience = ROOT / 'public' / timeline['mix']['ambienceFile']
    impact = ROOT / 'public' / timeline['mix']['impactFile']
    if duration(ambience) + 1 / 24000 < timeline['duration']:
        raise ValueError('Ambiance trop courte.')
    event = next(event for event in timeline['events'] if event['type'] == 'bridgeCollapse')
    if event['start'] + duration(impact) > timeline['duration']:
        raise ValueError('Impact tronqué par la composition.')
    print(f"Audio-First : {len(timeline['beats'])} fichiers complets, {sum(len(beat['words']) for beat in timeline['beats'])} mots, {timeline['duration']:.3f} s ; médias et source vérifiés.")


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        print(f'Préflight Audio-First refusé : {error}', file=sys.stderr)
        sys.exit(1)
