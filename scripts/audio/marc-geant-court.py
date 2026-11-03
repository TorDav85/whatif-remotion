"""Voice-over (XTTS) and procedural sound design for MarcGeantCourt (pilot 1.11), fitted to fixed visual slots."""
import argparse
import hashlib
import json
import math
import os
import sys
import wave
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'scripts/audio/xtts'))
from audio import duration, ffmpeg
from profiles import resolve_reference

SLUG = 'marc-geant-court'
MODEL = 'tts_models/multilingual/multi-dataset/xtts_v2'
SETTINGS = {'split_sentences': False, 'temperature': 0.5, 'repetition_penalty': 2.0, 'top_k': 40, 'top_p': 0.85,
            'gpt_cond_len': 6, 'gpt_cond_chunk_len': 3}
MAX_SPEED = 1.3
RATE = 44100


def voice(story, args):
    os.environ.setdefault('TTS_HOME', str(ROOT / '.cache'))
    os.environ.setdefault('HF_HOME', str(ROOT / '.cache/huggingface'))
    accepted = json.loads((ROOT / '.cache/xtts-cpml-accepted.json').read_text(encoding='utf-8'))
    if accepted.get('model') != MODEL:
        raise RuntimeError('XTTS license acceptance does not match this model.')
    os.environ['COQUI_TOS_AGREED'] = '1'
    reference, profile = resolve_reference(args.voice)
    ref_hash = hashlib.sha256(reference.read_bytes()).hexdigest()
    cache = ROOT / '.cache' / SLUG
    cache.mkdir(parents=True, exist_ok=True)
    folder = ROOT / 'public' / SLUG
    folder.mkdir(parents=True, exist_ok=True)
    tts = None
    out = []
    for i, beat in enumerate(story['beats']):
        seed = beat.get('seed', 27000 + i)
        key = hashlib.sha256(json.dumps([beat['text'], ref_hash, seed, SETTINGS, MODEL]).encode()).hexdigest()
        raw = cache / f'{key}.wav'
        if args.force or not raw.exists():
            import torch
            from TTS.api import TTS
            if tts is None:
                device = 'cuda' if torch.cuda.is_available() else 'cpu'
                print(f'Voix : {profile} ; XTTS sur {device}', flush=True)
                tts = TTS(MODEL).to(device)
            torch.manual_seed(seed)
            tts.tts_to_file(text=beat['text'], speaker_wav=str(reference), language='fr', file_path=str(raw), **SETTINGS)
        clean = cache / f'{key}-clean.wav'
        if args.force or not clean.exists():
            ffmpeg('-y', '-i', raw, '-af',
                   'silenceremove=start_periods=1:start_duration=0.02:start_threshold=-42dB,areverse,'
                   'silenceremove=start_periods=1:start_duration=0.04:start_threshold=-42dB,areverse,'
                   'silenceremove=stop_periods=-1:stop_duration=0.5:stop_threshold=-38dB:stop_silence=0.22',
                   '-ac', '1', '-ar', '24000', clean)
        start, end = beat['slot']
        natural = duration(clean)
        speed = max(1.0, natural / (end - start))
        if speed > MAX_SPEED:
            raise RuntimeError(f'{beat["id"]} : {natural:.2f} s pour un créneau de {end - start:.2f} s '
                               f'(×{speed:.2f}). Raccourcis le texte ou change la seed.')
        dest = folder / f'{beat["id"]}.wav'
        ffmpeg('-y', '-i', clean, '-af', f'atempo={speed:.6f},loudnorm=I=-16:TP=-1.5:LRA=7',
               '-ac', '1', '-ar', '24000', dest)
        measured = duration(dest)
        out.append({'id': beat['id'], 'text': beat['text'], 'start': start, 'duration': round(measured, 4),
                    'end': round(start + measured, 4), 'speed': round(speed, 4), 'seed': seed,
                    'audio': f'{SLUG}/{beat["id"]}.wav', 'sha256': hashlib.sha256(dest.read_bytes()).hexdigest()})
        print(f'{beat["id"]:10s} {measured:5.2f} s  (créneau {end - start:4.1f} s, ×{speed:.2f})', flush=True)
    return out, profile


def smooth(a, b, x):
    import numpy as np
    f = np.clip((x - a) / (b - a), 0, 1)
    return f * f * (3 - 2 * f)


def window(t, a, b, fade=1.0):
    return smooth(a - fade, a, t) * (1 - smooth(b, b + fade, t))


TARGET_LUFS = -16.0


def even_out(beats):
    """Second pass: single-pass loudnorm is loose on short lines, so measure each line and fix its gain."""
    import re
    import subprocess
    import imageio_ffmpeg
    exe = imageio_ffmpeg.get_ffmpeg_exe()
    for b in beats:
        path = ROOT / 'public' / b['audio']
        log = subprocess.run([exe, '-hide_banner', '-nostats', '-i', str(path), '-af', 'ebur128', '-f', 'null', '-'],
                             capture_output=True, text=True, encoding='utf-8', errors='replace').stderr
        lufs = float(re.search(r'I:\s+(-?[\d.]+) LUFS', log[log.rfind('Summary:'):]).group(1))
        gain = TARGET_LUFS - lufs
        if abs(gain) > 0.3:
            tmp = path.with_suffix('.tmp.wav')
            ffmpeg('-y', '-i', path, '-af', f'volume={gain:.2f}dB,alimiter=limit=0.89:level=false', '-ac', '1', '-ar', '24000', tmp)
            tmp.replace(path)
            b['sha256'] = hashlib.sha256(path.read_bytes()).hexdigest()
        print(f"{b['id']:10s} {lufs:6.1f} LUFS -> gain {gain:+.1f} dB", flush=True)


def source_ambience():
    """MarcGeant's sound design on its own timeline, without its voice ducking."""
    import importlib.util
    spec = importlib.util.spec_from_file_location('marc_geant', ROOT / 'scripts/audio/marc-geant.py')
    geant = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(geant)
    geant.SLUG = f'{SLUG}/source'
    (ROOT / 'public' / SLUG / 'source').mkdir(parents=True, exist_ok=True)
    path = ROOT / 'public' / geant.ambience(83, [])
    with wave.open(str(path), 'rb') as f:
        import numpy as np
        data = np.frombuffer(f.readframes(f.getnframes()), dtype='<i2').reshape(-1, 2).astype(float) / 32767
    path.unlink()
    path.parent.rmdir()
    return data


def ambience(length, beats):
    """Cut the source ambience like the picture (editorial.json), then duck it under the new voice."""
    import numpy as np
    edit = json.loads((ROOT / 'src/videos' / SLUG / 'editorial.json').read_text(encoding='utf-8'))['edit']
    src = source_ambience()
    n = int(length * RATE)
    out = np.zeros((n, 2))
    fade = int(0.03 * RATE)
    for seg in edit:
        a = int(seg['src'] * RATE)
        k = int(seg['dur'] * RATE)
        piece = src[a:a + k].copy()
        ramp = np.linspace(0, 1, fade)[:, None]
        piece[:fade] *= ramp
        piece[-fade:] *= ramp[::-1]
        at = int(seg['at'] * RATE)
        out[at:at + len(piece)] += piece[:max(0, n - at)]
    t = np.arange(n) / RATE
    duck = np.ones(n)
    for b in beats:
        duck -= 0.45 * window(t, b['start'], b['end'], 0.2)
    out *= (np.clip(duck, 0.45, 1) * (1 - smooth(length - 0.6, length, t)))[:, None]
    stereo = (np.clip(out, -1, 1) * 32767).astype('<i2')
    dest = ROOT / 'public' / SLUG / 'ambience.wav'
    with wave.open(str(dest), 'wb') as f:
        f.setnchannels(2)
        f.setsampwidth(2)
        f.setframerate(RATE)
        f.writeframes(stereo.tobytes())
    return f'{SLUG}/ambience.wav'


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--voice', help='profil vocal (par défaut : profil actif)')
    parser.add_argument('--force', action='store_true', help='régénère toutes les prises')
    args = parser.parse_args()
    story = json.loads((ROOT / 'src/videos' / SLUG / 'narration.json').read_text(encoding='utf-8'))
    beats, profile = voice(story, args)
    even_out(beats)
    amb = ambience(story['duration'], beats)
    result = {'voice': profile, 'ambience': amb, 'beats': beats}
    (ROOT / 'src/videos' / SLUG / 'voice.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'OK : {len(beats)} répliques + ambiance -> public/{SLUG}/', flush=True)


if __name__ == '__main__':
    main()
