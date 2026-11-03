"""Voice-over (XTTS) and procedural sound design for MarcSalaire3, fitted to fixed visual slots."""
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

SLUG = 'marc-salaire-3'
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


# Story events (seconds) mirrored from src/videos/marc-salaire-3/Scene3D.tsx.
CHAIR = (5.4, 7.6)
REVEAL = 7.6
LOTO = 15.6
PAYS = [22.2, 23.0, 23.8, 24.6, 25.4, 26.2]
CURTAIN = (47.6, 49.4)
RUN = (58.6, 61.6)
END = 76.4


def ambience(length, beats):
    import numpy as np
    rng = np.random.default_rng(83)
    n = int(length * RATE)
    t = np.arange(n) / RATE
    noise = rng.standard_normal(n)
    mix = np.zeros(n)

    # Tense drone until the reveal, then a bouncy comic tune for the rest.
    drone = np.sin(2 * np.pi * 55 * t) + 0.5 * np.sin(2 * np.pi * 65.41 * t)
    mix += drone * window(t, 0.0, REVEAL, 0.4) * 0.05
    chords = [[130.81, 164.81, 196.0, 261.63], [174.61, 220.0, 261.63, 349.23],
              [196.0, 246.94, 293.66, 392.0], [130.81, 164.81, 196.0, 261.63]]
    step = 60 / 120 / 2
    for k, at in enumerate(np.arange(REVEAL + 0.6, END - 0.2, step)):
        if RUN[0] < at < RUN[1]:
            continue
        chord = chords[(k // 8) % 4]
        add(mix, at, pluck(chord[(k * 3) % 4] * 2, 0.6, rng, 0.99), 0.055)
        if k % 2 == 0:
            add(mix, at, pluck(chord[0] / 2, 0.8, rng, 0.993), 0.12)

    # The chair turns, then a comic "ta-da" sting and a record scratch on the reveal.
    d = np.arange(int((CHAIR[1] - CHAIR[0]) * RATE)) / RATE
    add(mix, CHAIR[0], np.sin(2 * np.pi * np.cumsum(150 + 40 * np.sin(2 * np.pi * 1.5 * d)) / RATE) * np.sin(np.pi * d / d[-1]) * 0.6, 0.06)
    d = np.arange(int(0.35 * RATE)) / RATE
    add(mix, REVEAL, np.sin(2 * np.pi * np.cumsum(900 - 2200 * d) / RATE) * np.exp(-d * 5) + 0.4 * rng.standard_normal(len(d)) * np.exp(-d * 10), 0.15)
    for i, hz in enumerate([523.25, 659.25, 783.99]):
        add(mix, REVEAL + 0.4 + 0.12 * i, pluck(hz, 0.7, rng, 0.99), 0.14)
    # Flashback swooshes.
    for at in [10.6, 12.6]:
        d = np.arange(int(0.6 * RATE)) / RATE
        add(mix, at, lowpass(rng.standard_normal(len(d)), 5) * np.sin(np.pi * d / 0.6) ** 2, 0.15)
    # Lottery jackpot bells, then bank "ka-chings" for the monthly payments.
    for i in range(10):
        d = np.arange(int(0.4 * RATE)) / RATE
        add(mix, LOTO + 0.08 * i, np.sin(2 * np.pi * (1800 + 200 * (i % 3)) * d) * np.exp(-d * 10), 0.06)
    for at in PAYS:
        for off, hz in [(0.0, 1318.5), (0.09, 1760.0)]:
            d = np.arange(int(0.4 * RATE)) / RATE
            add(mix, at + off, np.sin(2 * np.pi * hz * d) * np.exp(-d * 9), 0.1)
    # Curtain opening, then the pizza oven roaring.
    d = np.arange(int((CURTAIN[1] - CURTAIN[0]) * RATE)) / RATE
    add(mix, CURTAIN[0], lowpass(rng.standard_normal(len(d)), 4) * np.sin(np.pi * d / d[-1]), 0.1)
    oven = window(t, CURTAIN[1], RUN[1], 0.5)
    mix += oven * (lowpass(noise, 8) * 0.06 + np.sin(2 * np.pi * 70 * t) * 0.02)
    # Marc runs: fast cartoon footsteps and a "zoom" whoosh.
    for at in np.arange(RUN[0] + 0.1, RUN[1], 0.11):
        d = np.arange(int(0.04 * RATE)) / RATE
        add(mix, float(at), np.sin(2 * np.pi * 160 * d) * np.exp(-d * 80), 0.18)
    d = np.arange(int(0.8 * RATE)) / RATE
    add(mix, RUN[0] + 0.8, np.sin(2 * np.pi * np.cumsum(400 + 1600 * d) / RATE) * np.sin(np.pi * d / 0.8) ** 2, 0.08)

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
