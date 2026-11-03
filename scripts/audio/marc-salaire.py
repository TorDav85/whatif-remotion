"""Voice-over (XTTS) and procedural sound design for MarcSalaire, fitted to fixed visual slots."""
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

SLUG = 'marc-salaire'
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


# Story events (seconds) mirrored from src/videos/marc-salaire/Scene3D.tsx.
PAYMENTS = [0.6, 6.4, 17.0, 29.0, 48.0]  # bank notifications
RING = (12.0, 15.0)
TV = 24.2
NIGHT = 34.2
CAR = 35.0
MSG = [53.6, 59.0]
BELL = 66.6
DOOR_OPEN = 68.6
END = 76.8


def ambience(length, beats):
    import numpy as np
    rng = np.random.default_rng(61)
    n = int(length * RATE)
    t = np.arange(n) / RATE
    noise = rng.standard_normal(n)
    mix = np.zeros(n)

    # Music: light and bouncy while the money rains, then a low pulsing thriller bed from the black car on.
    music = np.zeros(n)
    happy = [[130.81, 164.81, 196.0, 261.63], [174.61, 220.0, 261.63, 349.23],
             [196.0, 246.94, 293.66, 392.0], [130.81, 164.81, 196.0, 261.63]]
    step = 60 / 118 / 2
    for k, at in enumerate(np.arange(0.3, NIGHT - 0.3, step)):
        chord = happy[(k // 8) % 4]
        add(music, at, pluck(chord[(k * 3) % 4] * 2, 0.6, rng, 0.99), 0.055)
        if k % 2 == 0:
            add(music, at, pluck(chord[0] / 2, 0.8, rng, 0.993), 0.11)
    mix += music * smooth(0, 0.8, t)
    # Thriller: a minor drone and a heartbeat-like pulse that speeds up toward midnight.
    tense = window(t, NIGHT, DOOR_OPEN + 0.3, 1.0)
    mix += tense * (np.sin(2 * np.pi * 55 * t) + 0.5 * np.sin(2 * np.pi * 65.41 * t) + 0.3 * np.sin(2 * np.pi * 82.41 * t)) * (0.03 + 0.03 * smooth(NIGHT, BELL, t))
    at = NIGHT + 0.5
    while at < DOOR_OPEN:
        bpm = 70 + 60 * smooth(NIGHT, BELL, at)
        d = np.arange(int(0.2 * RATE)) / RATE
        add(mix, at, np.sin(2 * np.pi * 50 * d) * np.exp(-d * 20), 0.25)
        at += 60 / bpm
    # Rising strings into the doorbell, then silence.
    riser = window(t, 60.0, BELL, 0.3) * smooth(60.0, BELL, t)
    mix += riser * np.sin(2 * np.pi * np.cumsum(220 + 220 * smooth(60.0, BELL, t)) / RATE) * 0.04

    # Bank notification: a two-note "ka-ching" with a coin shimmer.
    for at in PAYMENTS:
        for off, hz in [(0.0, 1318.5), (0.09, 1760.0)]:
            d = np.arange(int(0.5 * RATE)) / RATE
            add(mix, at + off, np.sin(2 * np.pi * hz * d) * np.exp(-d * 8), 0.14)
        for c in rng.uniform(at, at + 0.4, 8):
            d = np.arange(int(0.05 * RATE)) / RATE
            add(mix, float(c), np.sin(2 * np.pi * rng.uniform(3000, 5000) * d) * np.exp(-d * 60), 0.03)
    # Phone ringing out, nobody answers.
    for at in np.arange(*RING, 1.5):
        d = np.arange(int(0.8 * RATE)) / RATE
        ring = (np.sin(2 * np.pi * 440 * d) + np.sin(2 * np.pi * 480 * d)) * 0.5 * (d < 0.7)
        add(mix, float(at), ring, 0.05)
    # The TV switches on: a whoosh and a little fanfare.
    d = np.arange(int(0.6 * RATE)) / RATE
    add(mix, TV - 0.3, lowpass(rng.standard_normal(len(d)), 6) * np.sin(np.pi * d / 0.6) ** 2, 0.18)
    for i, hz in enumerate([523.25, 659.25, 783.99, 1046.5]):
        add(mix, TV + 0.1 * i, pluck(hz, 0.6, rng, 0.99), 0.12)
    # Night: the car idling below.
    idle = window(t, CAR, 52.0, 0.8)
    mix += idle * lowpass(noise, 60) * (0.6 + 0.4 * np.sin(2 * np.pi * 14 * t)) * 0.25
    # Message notifications: a sharp double blip.
    for at in MSG:
        for off in (0.0, 0.12):
            d = np.arange(int(0.08 * RATE)) / RATE
            add(mix, at + off, np.sin(2 * np.pi * 1500 * d) * np.exp(-d * 30), 0.2)
    # Midnight: clock chime, doorbell, then the door creaks open.
    for i in range(3):
        d = np.arange(int(1.2 * RATE)) / RATE
        add(mix, 64.8 + 0.55 * i, (np.sin(2 * np.pi * 392 * d) + 0.4 * np.sin(2 * np.pi * 784 * d)) * np.exp(-d * 3), 0.06)
    for off, hz in [(0.0, 659.25), (0.45, 523.25)]:
        d = np.arange(int(0.8 * RATE)) / RATE
        add(mix, BELL + off, np.sin(2 * np.pi * hz * d) * np.exp(-d * 4), 0.22)
    d = np.arange(int(1.2 * RATE)) / RATE
    add(mix, DOOR_OPEN, np.sin(2 * np.pi * np.cumsum(260 + 120 * np.sin(2 * np.pi * 2.5 * d)) / RATE) * np.sin(np.pi * d / 1.2) ** 2, 0.06)
    # A bright sting on the end card.
    for i, hz in enumerate([392.0, 523.25, 659.25]):
        add(mix, END + 0.1 + 0.08 * i, pluck(hz * 2, 0.8, rng, 0.993), 0.12)

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
