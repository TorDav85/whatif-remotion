"""Generate local French XTTS narration and fit each phrase inside its beat."""
import argparse
import hashlib
import json
import os
import re
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from audio import ROOT, duration, ffmpeg, project_path
from profiles import resolve_reference

MODEL = 'tts_models/multilingual/multi-dataset/xtts_v2'


def text_for(beat, title=None):
    # An explicitly empty voice means intentional silence (e.g. a loop ending).
    value = beat.get('voice') if 'voice' in beat else beat.get('caption') or beat.get('title', '')
    if value is True:
        value = title
    if not isinstance(value, str):
        return ''
    return re.sub(r'[{}]', '', value or '').strip()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('timeline', nargs='?', default='src/videos/whatif/timeline.json')
    reference_options = parser.add_mutually_exclusive_group()
    reference_options.add_argument('--reference', help='Direct reference WAV path')
    reference_options.add_argument('--voice', help='Named voice imported with voice:add')
    parser.add_argument('--output-dir', help='Relative to public/')
    parser.add_argument('--language', default='fr')
    parser.add_argument('--device', choices=['auto', 'cuda', 'cpu'], default='auto')
    parser.add_argument('--force', action='store_true')
    parser.add_argument('--activate', action='store_true', help='Enable narration only after all beats succeed')
    parser.add_argument('--max-speed', type=float, default=2)
    parser.add_argument('--dry-run', action='store_true')
    parser.add_argument('--accept-license', action='store_true', help='Record your acceptance of the non-commercial XTTS CPML')
    args = parser.parse_args()
    timeline_path = project_path(args.timeline)
    timeline = json.loads(timeline_path.read_text(encoding='utf-8-sig'))
    public = ROOT / 'public'
    directory = args.output_dir or timeline.get('audio', {}).get('voiceDir', 'voice')
    output = (public / directory).resolve()
    if not output.is_relative_to(public.resolve()) or output == public.resolve():
        parser.error('output-dir doit désigner un sous-dossier de public/.')
    if not 1 <= args.max_speed <= 2:
        parser.error('max-speed doit être compris entre 1 et 2.')
    beats = timeline.get('beats', [])
    jobs = []
    spoken = [(i, beat, text_for(beat, timeline.get('title'))) for i, beat in enumerate(beats)]
    spoken = [(i, beat, text) for i, beat, text in spoken if text]
    for position, (i, beat, text) in enumerate(spoken):
        if not isinstance(beat.get('t'), (int, float)):
            parser.error(f'Beat {i} : ajoutez des timings t/end (les seuils atC de Chaleur ne sont pas des secondes).')
        start = float(beat['t'])
        end = min(float(beat.get('end', timeline['duration'])),
                  float(spoken[position + 1][1]['t']) if position + 1 < len(spoken) else float(timeline['duration']))
        if start < 0 or end <= start or end > timeline['duration']:
            parser.error(f'Timing invalide au beat {i}.')
        jobs.append((i, text, start, end))
    if not jobs:
        parser.error('Aucun texte à synthétiser.')
    if args.dry_run:
        print(json.dumps([{'beat': i, 'text': text, 'start': start, 'end': end}
                          for i, text, start, end in jobs], ensure_ascii=False, indent=2))
        return
    reference, profile = resolve_reference(args.voice, args.reference)
    if not reference.is_file() or duration(reference) < 3:
        parser.error('Ajoutez une voix avec npm run voice:add -- ma-voix <audio>, puis npm run voice:use -- ma-voix.')
    print(f'Référence vocale : {profile or reference.name}', flush=True)
    # Keep model weights and Hugging Face caches within this project.
    os.environ.setdefault('TTS_HOME', str(ROOT / '.cache'))
    os.environ.setdefault('HF_HOME', str(ROOT / '.cache' / 'huggingface'))
    consent = ROOT / '.cache' / 'xtts-cpml-accepted.json'
    if args.accept_license:
        consent.parent.mkdir(parents=True, exist_ok=True)
        consent.write_text(json.dumps({'model': MODEL, 'license': 'https://tts-hub.github.io/cpml',
                                       'acceptedAt': datetime.now(timezone.utc).isoformat()}), encoding='utf-8')
    if consent.exists():
        accepted = json.loads(consent.read_text(encoding='utf-8'))
        if accepted.get('model') == MODEL and accepted.get('license') == 'https://tts-hub.github.io/cpml':
            os.environ['COQUI_TOS_AGREED'] = '1'
    import torch
    from TTS.api import TTS
    device = ('cuda' if torch.cuda.is_available() else 'cpu') if args.device == 'auto' else args.device
    if device == 'cuda' and not torch.cuda.is_available():
        raise RuntimeError('CUDA indisponible : vérifiez torch et le pilote NVIDIA.')
    torch.set_num_threads(min(8, os.cpu_count() or 1))
    output.mkdir(parents=True, exist_ok=True)
    manifest_file = output / 'timing.json'
    previous = json.loads(manifest_file.read_text(encoding='utf-8')) if manifest_file.exists() else {}
    cached = {item['beat']: item for item in previous.get('beats', [])}
    reference_hash = hashlib.sha256(reference.read_bytes()).hexdigest()
    model = None
    results = []
    for i, text, start, end in jobs:
        target = output / f'beat-{i}.wav'
        signature = hashlib.sha256(json.dumps([MODEL, 'coqui-tts-0.28.0', reference_hash, text,
                                              args.language, start, end, args.max_speed]).encode()).hexdigest()
        old = cached.get(i, {})
        if not args.force and target.exists() and old.get('signature') == signature and old.get('sha256') == hashlib.sha256(target.read_bytes()).hexdigest():
            results.append(old)
            print(f'Beat {i} déjà à jour.', flush=True)
            continue
        if model is None:
            print(f'Chargement XTTS v2 sur {device}...', flush=True)
            model = TTS(MODEL).to(device)
        torch.manual_seed(2026 + i)
        with tempfile.TemporaryDirectory(dir=output) as tmp:
            raw, trimmed, fitted = [Path(tmp) / name for name in ('raw.wav', 'trimmed.wav', 'fitted.wav')]
            print(f'Beat {i}: {text}', flush=True)
            model.tts_to_file(text=text, speaker_wav=str(reference), language=args.language, file_path=str(raw))
            ffmpeg('-y', '-i', raw, '-af',
                   'silenceremove=start_periods=1:start_duration=0.03:start_threshold=-45dB,'
                   'areverse,silenceremove=start_periods=1:start_duration=0.06:start_threshold=-45dB,areverse',
                   '-ac', 1, '-ar', 24000, '-c:a', 'pcm_s16le', trimmed)
            raw_seconds = duration(trimmed)
            available = end - start - min(0.08, (end - start) * 0.05)
            speed = max(1, raw_seconds / available)
            if raw_seconds < 0.1 or speed > args.max_speed:
                raise RuntimeError(f'Beat {i}: durée {raw_seconds:.2f} s pour {available:.2f} s. '
                                   'Raccourcissez le champ voice ou ajustez le timing.')
            ffmpeg('-y', '-i', trimmed, '-af', f'atempo={speed:.8f},loudnorm=I=-18:TP=-2:LRA=11',
                   '-ac', 1, '-ar', 24000, '-c:a', 'pcm_s16le', fitted)
            actual = duration(fitted)
            if actual > end - start + 0.005:
                raise RuntimeError(f'Beat {i} dépasse son créneau ({actual:.3f} s).')
            fitted.replace(target)
        results.append({'beat': i, 'text': text, 'start': start, 'end': end, 'duration': actual,
                        'originalDuration': raw_seconds, 'speed': speed, 'signature': signature,
                        'sha256': hashlib.sha256(target.read_bytes()).hexdigest()})
        # Save progress after every beat so an interrupted run can resume safely.
        manifest_file.write_text(json.dumps({'model': MODEL, 'device': device, 'profile': profile,
                                            'referenceSha256': reference_hash, 'beats': results},
                                           ensure_ascii=False, indent=2), encoding='utf-8')
        print(f'  {actual:.2f} s / {end - start:.2f} s, vitesse {speed:.2f}x', flush=True)
    manifest_file.write_text(json.dumps({'model': MODEL, 'device': device, 'profile': profile,
                                        'referenceSha256': reference_hash, 'beats': results},
                                       ensure_ascii=False, indent=2), encoding='utf-8')
    if args.activate:
        timeline.setdefault('audio', {}).update(voice=True, voiceDir=directory)
        timeline_path.write_text(json.dumps(timeline, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'{len(results)} pistes validées dans {output}', flush=True)


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        print(f'Échec XTTS : {error}', file=sys.stderr, flush=True)
        sys.exit(1)
