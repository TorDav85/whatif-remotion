"""Voice-over (XTTS) and procedural sound design for MarcSoif, fitted to fixed visual slots."""
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

SLUG = 'marc-soif'
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


# Story events (seconds) mirrored from src/videos/marc-soif/Scene3D.tsx.
DAYS = [4.6, 20.6, 32.6, 44.6, 55.4]
STOP = 63.6   # the heartbeat stops, the screen goes dark
BRIGHT = 67.4 # back to light: the facts, then Marc drinks
GULPS = [76.2, 76.75, 77.3, 77.85]
END = 80.6


def heartbeat(length, start, end, bpm0, bpm1, rng):
    """Lub-dub that speeds up from bpm0 to bpm1; returns a mono track."""
    import numpy as np
    out = np.zeros(int(length * RATE))
    at = start
    while at < end:
        k = (at - start) / max(1e-6, end - start)
        bpm = bpm0 + (bpm1 - bpm0) * k
        for off, hz, g in [(0.0, 52, 1.0), (0.16, 64, 0.65)]:
            d = np.arange(int(0.18 * RATE)) / RATE
            add(out, at + off, np.sin(2 * np.pi * hz * d) * np.exp(-d * 22) * (1 - np.exp(-d * 300)), g * (0.5 + 0.5 * k))
        at += 60 / bpm
    return out


def ambience(length, beats):
    import numpy as np
    rng = np.random.default_rng(91)
    n = int(length * RATE)
    t = np.arange(n) / RATE
    mix = np.zeros(n)

    # Music: plucked arpeggio, bright on day 1, thinning and slowing as Marc dries out; silent at the stop,
    # back in a major key for the facts and the glass of water.
    music = np.zeros(n)
    minor = [[110.0, 164.81, 220.0, 261.63], [87.31, 130.81, 174.61, 220.0],
             [98.0, 146.83, 196.0, 233.08], [82.41, 123.47, 164.81, 207.65]]
    major = [[130.81, 196.0, 261.63, 329.63], [174.61, 220.0, 261.63, 349.23],
             [196.0, 246.94, 293.66, 392.0], [130.81, 196.0, 261.63, 329.63]]
    step = 60 / 100 / 2
    for k, at in enumerate(np.arange(0.3, STOP - 0.8, step)):
        if at > 44.6 and k % 2:  # day 4: half the notes drop out
            continue
        chord = minor[(k // 8) % 4]
        add(music, at, pluck(chord[k % 4], 1.2, rng, 0.994), 0.07 * (1 - 0.5 * smooth(32, 60, at)))
    for k, at in enumerate(np.arange(0.3, STOP - 0.8, step * 8)):
        add(music, at, pluck(minor[k % 4][0] / 2, 3.0, rng, 0.998), 0.12)
    for k, at in enumerate(np.arange(BRIGHT, END - 1.0, step)):
        chord = major[(k // 8) % 4]
        add(music, at, pluck(chord[k % 4] * 2, 1.2, rng, 0.994), 0.07)
    for k, at in enumerate(np.arange(BRIGHT, END - 1.0, step * 8)):
        add(music, at, pluck(major[k % 4][0] / 2, 3.0, rng, 0.998), 0.12)
    mix += music * smooth(0, 1.2, t)

    # Each new day: a soft rising whoosh and a bell.
    for at in DAYS:
        d = np.arange(int(1.0 * RATE)) / RATE
        add(mix, at - 0.7, lowpass(rng.standard_normal(len(d)), 8) * np.sin(np.pi * d) ** 2, 0.18)
        d = np.arange(int(1.6 * RATE)) / RATE
        bell = (np.sin(2 * np.pi * 880 * d) + 0.5 * np.sin(2 * np.pi * 1320 * d) + 0.25 * np.sin(2 * np.pi * 2210 * d)) * np.exp(-d * 3)
        add(mix, at, bell, 0.08)

    # Day 1: the glass slides on the table. Sweat and breath drops while he loses water.
    d = np.arange(int(0.35 * RATE)) / RATE
    add(mix, 6.0, lowpass(rng.standard_normal(len(d)), 3) * np.sin(np.pi * d / 0.35), 0.1)
    for at in np.arange(15.8, 19.4, 0.45):
        d = np.arange(int(0.12 * RATE)) / RATE
        hz = rng.uniform(700, 1100)
        add(mix, float(at), np.sin(2 * np.pi * (hz + 2400 * d) * d) * np.exp(-d * 40), 0.08)
    # Toilet flush at "aux toilettes".
    d = np.arange(int(1.4 * RATE)) / RATE
    add(mix, 18.3, lowpass(rng.standard_normal(len(d)), 14) * np.sin(np.pi * d / 1.4) ** 1.5, 0.22)

    # Heartbeat from day 2, faster and louder each day, then it stops.
    mix += heartbeat(length, 26.0, STOP, 72, 150, rng) * 0.32
    # Days 3-5: a high tinnitus whine (headache), growing.
    mix += window(t, 33.0, STOP, 1.5) * np.sin(2 * np.pi * 4200 * t) * 0.006 * smooth(33, 60, t)
    # Day 5: a low heat drone.
    mix += window(t, 55.4, STOP, 1.0) * (np.sin(2 * np.pi * 46 * t) + 0.5 * np.sin(2 * np.pi * 69 * t)) * 0.04

    # After the stop: a flat-line tone fading out.
    mix += window(t, STOP, STOP + 2.2, 0.3) * np.sin(2 * np.pi * 1000 * t) * 0.03 * (1 - smooth(STOP, STOP + 2.5, t))

    # Marc drinks: pouring, then gulps.
    d = np.arange(int(1.2 * RATE)) / RATE
    pour = lowpass(rng.standard_normal(len(d)), 4) * np.sin(np.pi * d / 1.2) * (0.6 + 0.4 * np.sin(2 * np.pi * 9 * d))
    add(mix, 74.6, pour, 0.12)
    for at in GULPS:
        d = np.arange(int(0.16 * RATE)) / RATE
        add(mix, at, np.sin(2 * np.pi * (180 - 300 * d) * d) * np.sin(np.pi * d / 0.16), 0.3)
    d = np.arange(int(0.5 * RATE)) / RATE
    add(mix, 78.5, lowpass(rng.standard_normal(len(d)), 5) * np.exp(-d * 6), 0.12)  # "ahh"

    duck = np.ones(n)
    for b in beats:
        duck -= 0.45 * window(t, b['start'], b['end'], 0.2)
    mix *= np.clip(duck, 0.45, 1) * smooth(0, 0.2, t) * (1 - smooth(END - 0.2, length, t))
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
