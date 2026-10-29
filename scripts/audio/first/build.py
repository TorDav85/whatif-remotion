"""Build the short prototype: full-length XTTS files, controlled ASR words, compiled events."""
import argparse
import hashlib
import json
import math
import os
from pathlib import Path
import shutil
import struct
import subprocess
import sys
import wave

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / 'scripts/audio/xtts'))
from audio import duration
from profiles import resolve_reference
from compiler import compile_timeline, require, IDENTIFIER, unique_ids

MODEL = 'tts_models/multilingual/multi-dataset/xtts_v2'


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def write_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix('.tmp.json')
    temporary.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    temporary.replace(path)


def synthesize_background(folder, seconds, impact_duration):
    rate = 24000
    for name, length in [('ambience.wav', seconds), ('impact.wav', impact_duration)]:
        samples = []
        for i in range(math.ceil(length * rate)):
            t = i / rate
            sample = (0.055 * math.sin(2 * math.pi * 65 * t) + 0.025 * math.sin(2 * math.pi * 98 * t)) if name == 'ambience.wav' else 0.5 * math.exp(-t * 4.5) * math.sin(2 * math.pi * (65 * t - 8 * t * t))
            samples.append(int(max(-0.98, min(0.98, sample)) * 32767))
        with wave.open(str(folder / name), 'wb') as audio:
            audio.setnchannels(1)
            audio.setsampwidth(2)
            audio.setframerate(rate)
            audio.writeframes(struct.pack('<' + 'h' * len(samples), *samples))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--script', default='src/videos/audio-first-bridge/bridge.script.json')
    parser.add_argument('--compiled', default='src/videos/audio-first-bridge/compiled-timeline.json')
    parser.add_argument('--media-id', default='bridge-demo')
    parser.add_argument('--voice', help='Use an imported local voice instead of the demo preset')
    parser.add_argument('--asr-model', default='small')
    parser.add_argument('--alignment-dir', help='Reviewed local alignments keyed by beat id, tied to audio SHA256')
    parser.add_argument('--force-audio', action='store_true')
    args = parser.parse_args()
    require(IDENTIFIER.fullmatch(args.media_id), 'media-id invalide.')
    script = json.loads((ROOT / args.script).read_text(encoding='utf-8-sig'))
    require(script.get('schemaVersion') == 1 and script.get('scene') == 'bridge', 'Script ou scène Audio-First inconnu.')
    require(script.get('voice', {}).get('language') == 'fr', 'Le prototype contrôlé attend une narration française.')
    unique_ids(script.get('beats', []), 'Beats')
    output = ROOT / args.compiled
    require(output.resolve().is_relative_to(ROOT), 'La sortie compilée doit rester dans le projet.')
    cache = ROOT / '.cache/audio-first'
    for path in (cache / 'audio', cache / 'alignments'):
        path.mkdir(parents=True, exist_ok=True)
    folder = ROOT / 'public/audio-first' / args.media_id
    folder.mkdir(parents=True, exist_ok=True)
    os.environ.setdefault('TTS_HOME', str(ROOT / '.cache'))
    os.environ.setdefault('HF_HOME', str(ROOT / '.cache/huggingface'))
    consent = ROOT / '.cache/xtts-cpml-accepted.json'
    if consent.exists():
        acceptance = json.loads(consent.read_text(encoding='utf-8'))
        if acceptance.get('model') == MODEL and acceptance.get('license') == 'https://tts-hub.github.io/cpml':
            os.environ['COQUI_TOS_AGREED'] = '1'
    reference = resolve_reference(args.voice)[0] if args.voice else None
    voice_key = sha(reference) if reference else script['voice']['preset']
    tts = None
    jobs = []
    media, alignments = {}, {}
    for i, beat in enumerate(script['beats']):
        id = beat['id']
        require(IDENTIFIER.fullmatch(id), f'Identifiant de beat invalide : {id}')
        signature = hashlib.sha256(json.dumps([MODEL, 'coqui-tts-0.28.0-full-file', voice_key, beat['text'], script['voice']['language'], script['voice']['seed'] + i]).encode()).hexdigest()
        cached = cache / 'audio' / f'{signature}.wav'
        if not cached.exists() or args.force_audio:
            import torch
            from TTS.api import TTS
            if tts is None:
                device = 'cuda' if torch.cuda.is_available() else 'cpu'
                print(f'XTTS : {device}, fichiers complets, sans accélération ni suppression de silence.', flush=True)
                torch.set_num_threads(min(8, os.cpu_count() or 1))
                tts = TTS(MODEL).to(device)
            torch.manual_seed(script['voice']['seed'] + i)
            temporary = cached.with_suffix('.building.wav')
            kwargs = {'speaker_wav': str(reference)} if reference else {'speaker': script['voice']['preset']}
            tts.tts_to_file(text=beat['text'], language=script['voice']['language'], file_path=str(temporary), **kwargs)
            require(duration(temporary) > 0, f'Audio vide : {id}')
            temporary.replace(cached)
        target = folder / f'{id}.wav'
        shutil.copyfile(cached, target)
        measured, digest = duration(target), sha(target)
        media[id] = {'audioFile': target.relative_to(ROOT / 'public').as_posix(), 'audioDuration': measured, 'audioSha256': digest}
        print(f'{id}: durée complète {measured:.3f} s.', flush=True)
        alignment_key = hashlib.sha256(json.dumps([digest, args.asr_model, 'fr', 'word-timestamps-v1']).encode()).hexdigest()
        alignment_file = cache / 'alignments' / f'{alignment_key}.json'
        if args.alignment_dir:
            alignment_file = ROOT / args.alignment_dir / f'{id}.json'
        jobs.append({'id': id, 'file': str(target), 'audioSha256': digest, 'alignmentFile': str(alignment_file)})
    jobs_file = cache / 'jobs' / f'{args.media_id}.json'
    write_json(jobs_file, {'items': jobs, 'model': args.asr_model, 'downloadRoot': str(cache / 'whisper'), 'manual': bool(args.alignment_dir)})
    result = subprocess.run([sys.executable, str(Path(__file__).with_name('align.py')), '--jobs', str(jobs_file)])
    require(result.returncode == 0, 'La transcription isolée a échoué ; consultez la sortie ci-dessus.')
    alignments = json.loads(jobs_file.with_suffix('.result.json').read_text(encoding='utf-8'))
    compiled, report = compile_timeline(script, media, alignments)
    synthesize_background(folder, compiled['duration'], compiled['mix']['impactDuration'])
    compiled['mix'].update(ambienceFile=f'audio-first/{args.media_id}/ambience.wav', impactFile=f'audio-first/{args.media_id}/impact.wav')
    compiled['sourceScript'] = Path(args.script).as_posix()
    compiled['sourceSha256'] = hashlib.sha256(json.dumps(script, ensure_ascii=False, sort_keys=True, separators=(',', ':')).encode()).hexdigest()
    compiled['voice'] = {'profile': args.voice} if args.voice else {'preset': script['voice']['preset']}
    report['voice'] = compiled['voice']
    report['media'] = media
    report['transcriptions'] = {id: {'observedText': data.get('observedText'), 'words': data['words']} for id, data in alignments.items()}
    # Publish only after every audio, word and anchor has passed validation.
    write_json(output, compiled)
    write_json(output.with_name(output.stem + '.report.json'), report)
    print(f'Timeline validée : {compiled["duration"]:.3f} s ; rapport : {output.with_name(output.stem + ".report.json")}', flush=True)


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        print(f'Échec Audio-First : {error}', file=sys.stderr, flush=True)
        sys.exit(1)
