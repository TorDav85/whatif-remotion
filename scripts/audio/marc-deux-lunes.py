"""Voice-over (XTTS) and procedural sound design for MarcDeuxLunes, fitted to fixed visual slots."""
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

SLUG = 'marc-deux-lunes'
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
        seed = beat.get('seed', 26000 + i)
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


# Story events (seconds) mirrored from src/videos/marc-deux-lunes/Scene3D.tsx.
APPEAR = 2.4  # the second moon lights up
BIN = 7.2  # bin lid
DOGS = 28.3
TIDE = (33.0, 39.2)
ECLIPSES = [41.4, 44.2]
PULL = (47.0, 53.6)
CRASH = 56.6
RINGS = (60.2, 66.0)
END = 79.4


def ambience(length, beats):
    import numpy as np
    rng = np.random.default_rng(71)
    n = int(length * RATE)
    t = np.arange(n) / RATE
    noise = rng.standard_normal(n)
    mix = np.zeros(n)

    # Music: a slow, mysterious plucked arpeggio (D minor), paused for the crash, brighter for the rings.
    music = np.zeros(n)
    chords = [[146.83, 174.61, 220.0, 293.66], [116.54, 146.83, 174.61, 233.08],
              [130.81, 164.81, 196.0, 261.63], [110.0, 138.59, 164.81, 220.0]]
    step = 60 / 96 / 2
    for k, at in enumerate(np.arange(0.3, 55.8, step)):
        chord = chords[(k // 8) % 4]
        add(music, at, pluck(chord[(k * 3) % 4] * 2, 0.9, rng, 0.996), 0.055)
    for k, at in enumerate(np.arange(0.3, 55.8, step * 4)):
        add(music, at, pluck(chords[(k // 2) % 4][0] / 2, 1.2, rng, 0.995), 0.12)
    for k, at in enumerate(np.arange(60.4, END - 0.3, step)):
        chord = [[146.83, 185.0, 220.0, 293.66], [123.47, 146.83, 185.0, 246.94]][(k // 8) % 2]
        add(music, at, pluck(chord[(k * 3) % 4] * 4, 0.7, rng, 0.994), 0.05)
        if k % 4 == 0:
            add(music, at, pluck(chord[0] / 2, 1.0, rng, 0.994), 0.12)
    mix += music * smooth(0, 1.0, t)

    # Night: crickets in the street scenes.
    night = window(t, 0, 32.2, 0.4) + window(t, 63.8, length, 0.6)
    chirp = np.sin(2 * np.pi * 4300 * t) * (np.sin(2 * np.pi * 28 * t) > 0.3) * (np.sin(2 * np.pi * 0.9 * t) > 0.2)
    mix += night * chirp * 0.012

    # The second moon appears: a rising shimmer.
    d = np.arange(int(1.6 * RATE)) / RATE
    shimmer = sum(np.sin(2 * np.pi * f * d * (1 + 0.25 * d)) for f in (880, 1320, 1760)) * np.sin(np.pi * d / 1.6) ** 2
    add(mix, APPEAR - 0.4, shimmer, 0.05)
    add(mix, 8.4, shimmer, 0.04)
    # Trash bag and bin lid.
    d = np.arange(int(0.25 * RATE)) / RATE
    add(mix, BIN, np.sin(2 * np.pi * 140 * d) * np.exp(-d * 20) + lowpass(rng.standard_normal(len(d)), 4) * np.exp(-d * 25), 0.25)

    # Dogs howling: sliding, wavering tones, one after the other.
    for k, at in enumerate([DOGS, DOGS + 0.7, DOGS + 1.5]):
        d = np.arange(int(2.2 * RATE)) / RATE
        f0 = [520, 610, 450][k]
        f = f0 * (0.8 + 0.25 * np.sin(np.pi * np.minimum(d / 1.4, 1)) ) * (1 + 0.012 * np.sin(2 * np.pi * 6 * d))
        howl = (np.sin(2 * np.pi * np.cumsum(f) / RATE) + 0.3 * np.sin(4 * np.pi * np.cumsum(f) / RATE)) * np.sin(np.pi * d / 2.2) ** 1.5
        add(mix, at, howl, 0.06)

    # The sea: waves, louder as the tide rises.
    sea = window(t, TIDE[0], TIDE[1], 0.4)
    waves = lowpass(noise, 30) * (0.5 + 0.5 * np.sin(2 * np.pi * 0.18 * t) ** 2)
    rise = smooth(TIDE[0], TIDE[1], t)
    mix += sea * waves * (0.08 + 0.12 * rise)
    for at in [34.0, 36.2, 38.0]:
        d = np.arange(int(1.2 * RATE)) / RATE
        add(mix, at, lowpass(rng.standard_normal(len(d)), 6) * np.sin(np.pi * d / 1.2) ** 2, 0.12)

    # Eclipses: the light drops with a low drone.
    for at in ECLIPSES:
        mix += window(t, at - 0.6, at + 0.6, 0.5) * np.sin(2 * np.pi * 55 * t) * 0.06

    # The moons pull together: a rising drone, then the crash and a long rumble.
    pull = window(t, PULL[0], CRASH, 0.4)
    f = 50 + 40 * smooth(PULL[0], CRASH, t)
    mix += pull * np.sin(2 * np.pi * np.cumsum(f) / RATE) * (0.03 + 0.05 * smooth(PULL[0], CRASH, t))
    d = np.arange(int(4.0 * RATE)) / RATE
    boom = np.sin(2 * np.pi * (60 - 25 * np.minimum(d, 1)) * d) * np.exp(-d * 1.5) + lowpass(rng.standard_normal(len(d)), 8) * np.exp(-d * 1.2)
    add(mix, CRASH, boom, 0.5)
    for c in rng.uniform(CRASH, CRASH + 2.5, 40):
        d = np.arange(int(0.05 * RATE)) / RATE
        add(mix, float(c), rng.standard_normal(len(d)) * np.exp(-d * 90), 0.05)

    # Rings settling: a soft glassy pad.
    rings = window(t, RINGS[0], END, 1.0)
    mix += rings * sum(np.sin(2 * np.pi * f * t) for f in (587.3, 880.0, 1174.7)) * 0.008

    duck = np.ones(n)
    for b in beats:
        duck -= 0.45 * window(t, b['start'], b['end'], 0.2)
    mix *= np.clip(duck, 0.45, 1) * smooth(0, 0.2, t) * (1 - smooth(END + 2.0, length, t))
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
