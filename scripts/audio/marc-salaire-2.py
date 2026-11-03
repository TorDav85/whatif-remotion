"""Voice-over (XTTS) and procedural sound design for MarcSalaire2, fitted to fixed visual slots."""
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

SLUG = 'marc-salaire-2'
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
        seed = beat.get('seed', 22000 + i)
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


def lowpass(x, n):
    import numpy as np
    return np.convolve(x, np.ones(n) / n, mode='same')


def pluck(hz, length, rng, decay=0.996):
    """Karplus-Strong string: a warm, dry acoustic guitar note."""
    import numpy as np
    period = int(RATE / hz)
    buf = rng.uniform(-1, 1, period)
    out = np.empty(int(length * RATE))
    for i in range(len(out)):
        j = i % period
        out[i] = buf[j]
        buf[j] = decay * 0.5 * (buf[j] + buf[(j + 1) % period])
    return out


def add(track, at, sound, gain):
    i = int(at * RATE)
    if i >= len(track):
        return
    n = min(len(sound), len(track) - i)
    track[i:i + n] += sound[:n] * gain


# Story events (seconds) mirrored from src/videos/marc-salaire-2/Scene3D.tsx.
DOOR = 5.6
CAR_DOOR = 18.0
DRIVE = (22.0, 28.8)
LIFT = (34.8, 40.6)
ROOM = 40.6
CHAIR = (61.0, 64.6)
VOICE = 66.2
BLACK = 70.8
END = 77.0


def ambience(length, beats):
    import numpy as np
    rng = np.random.default_rng(71)
    n = int(length * RATE)
    t = np.arange(n) / RATE
    noise = rng.standard_normal(n)
    mix = np.zeros(n)

    # Thriller bed all along: minor drone plus a slow pulse that speeds up toward the chair.
    drone = (np.sin(2 * np.pi * 55 * t) + 0.5 * np.sin(2 * np.pi * 65.41 * t) + 0.25 * np.sin(2 * np.pi * 82.41 * t))
    mix += drone * window(t, 0.0, BLACK, 0.8) * (0.035 + 0.025 * smooth(ROOM, CHAIR[1], t))
    at = 1.0
    while at < BLACK - 0.5:
        bpm = 64 + 56 * smooth(ROOM, CHAIR[1], at)
        d = np.arange(int(0.2 * RATE)) / RATE
        add(mix, at, np.sin(2 * np.pi * 48 * d) * np.exp(-d * 18), 0.22)
        at += 60 / bpm
    # Plucked suspense motif (minor arpeggio), sparse.
    notes = [220.0, 261.63, 329.63, 311.13]
    for k, at in enumerate(np.arange(0.4, BLACK - 1.0, 60 / 90)):
        if k % 4 == 3:
            continue
        add(mix, at, pluck(notes[k % 4] * 2, 0.9, rng, 0.995), 0.05)

    # Door creak, envelope paper.
    d = np.arange(int(1.2 * RATE)) / RATE
    add(mix, DOOR, np.sin(2 * np.pi * np.cumsum(260 + 120 * np.sin(2 * np.pi * 2.5 * d)) / RATE) * np.sin(np.pi * d / 1.2) ** 2, 0.06)
    for at in [9.0, 11.0]:
        d = np.arange(int(0.4 * RATE)) / RATE
        add(mix, at, (rng.standard_normal(len(d)) - lowpass(rng.standard_normal(len(d)), 2)) * np.sin(np.pi * d / 0.4), 0.08)
    # Street: idling engine, car door unlocking and opening.
    idle = window(t, 16.0, 22.0, 0.5)
    mix += idle * lowpass(noise, 60) * (0.6 + 0.4 * np.sin(2 * np.pi * 14 * t)) * 0.25
    for off in (0.0, 0.15):
        d = np.arange(int(0.06 * RATE)) / RATE
        add(mix, CAR_DOOR - 0.6 + off, np.sin(2 * np.pi * 2000 * d) * np.exp(-d * 40), 0.12)
    d = np.arange(int(0.3 * RATE)) / RATE
    add(mix, CAR_DOOR, lowpass(rng.standard_normal(len(d)), 4) * np.exp(-d * 12), 0.25)
    add(mix, 21.2, np.sin(2 * np.pi * 90 * d) * np.exp(-d * 18), 0.3)
    # Driving: road rumble and passing streetlights (whooshes).
    drive = window(t, *DRIVE, 0.5)
    mix += drive * lowpass(lowpass(noise, 30), 30) * 4.0
    for at in np.arange(DRIVE[0] + 0.3, DRIVE[1] - 0.3, 0.9):
        d = np.arange(int(0.5 * RATE)) / RATE
        add(mix, float(at), lowpass(rng.standard_normal(len(d)), 6) * np.sin(np.pi * d / 0.5) ** 2, 0.06)
    # Elevator: ding, doors, a long hum going down, ding at -12, doors open.
    for at in [35.4, ROOM - 0.4]:
        d = np.arange(int(1.0 * RATE)) / RATE
        add(mix, at, np.sin(2 * np.pi * 988 * d) * np.exp(-d * 4), 0.12)
    lift = window(t, 36.2, ROOM - 0.5, 0.4)
    mix += lift * (np.sin(2 * np.pi * 110 * t) * 0.03 + lowpass(noise, 20) * 0.6)
    for at in [36.0, ROOM]:
        d = np.arange(int(0.8 * RATE)) / RATE
        add(mix, at, lowpass(rng.standard_normal(len(d)), 5) * np.sin(np.pi * d / 0.8), 0.07)
    # The screen room: electrical hum and soft beeps.
    room = window(t, ROOM, BLACK, 0.5)
    mix += room * (np.sin(2 * np.pi * 120 * t) * 0.012 + (noise - lowpass(noise, 2)) * 0.004)
    for at in rng.uniform(ROOM, CHAIR[0], 14):
        d = np.arange(int(0.06 * RATE)) / RATE
        add(mix, float(at), np.sin(2 * np.pi * 1800 * d) * np.exp(-d * 40), 0.03)
    # The chair: a slow creak while it turns, then a deep hit on the voice.
    d = np.arange(int((CHAIR[1] - CHAIR[0]) * RATE)) / RATE
    creak = np.sin(2 * np.pi * np.cumsum(140 + 40 * np.sin(2 * np.pi * 1.3 * d)) / RATE) * (0.5 + 0.5 * np.sin(2 * np.pi * 7 * d))
    add(mix, CHAIR[0], creak * np.sin(np.pi * d / d[-1]), 0.05)
    d = np.arange(int(2.5 * RATE)) / RATE
    add(mix, VOICE - 0.3, np.sin(2 * np.pi * 41 * d) * np.exp(-d * 1.6) + lowpass(rng.standard_normal(len(d)), 3) * np.exp(-d * 4) * 0.5, 0.45)
    # End card sting.
    for i, hz in enumerate([220.0, 261.63, 329.63]):
        add(mix, END + 0.1 + 0.1 * i, pluck(hz * 2, 0.9, rng, 0.995), 0.12)

    duck = np.ones(n)
    for b in beats:
        duck -= 0.45 * window(t, b['start'], b['end'], 0.2)
    mix *= np.clip(duck, 0.45, 1) * smooth(0, 0.15, t) * (1 - smooth(length - 1.0, length, t))
    peak = np.max(np.abs(mix)) or 1
    mix = np.tanh(mix / peak * 1.5) * 0.5
    left = mix
    right = np.concatenate([mix[int(0.004 * RATE):], np.zeros(int(0.004 * RATE))])
    stereo = (np.stack([left, right], axis=1) * 32767).astype('<i2')
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
    amb = ambience(story['duration'], beats)
    result = {'voice': profile, 'ambience': amb, 'beats': beats}
    (ROOT / 'src/videos' / SLUG / 'voice.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'OK : {len(beats)} répliques + ambiance -> public/{SLUG}/', flush=True)


if __name__ == '__main__':
    main()
