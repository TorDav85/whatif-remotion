"""Voice-over (XTTS) and procedural sound design for MarcBranchies, fitted to fixed visual slots."""
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

SLUG = 'marc-branchies'
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
        seed = beat.get('seed', 30000 + i)
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
        # One-pass loudnorm undershoots on short takes: measure and correct the gain (peak kept under -1 dB).
        lufs, peak = loudness(dest)
        if lufs is not None and abs(lufs + 16) > 0.6:
            gain = min(-16 - lufs, -1.0 - (peak if peak is not None else -1.5))
            fixed = cache / f'{key}-gain.wav'
            ffmpeg('-y', '-i', dest, '-af', f'volume={gain:.2f}dB', '-ac', '1', '-ar', '24000', fixed)
            fixed.replace(dest)
        measured = duration(dest)
        out.append({'id': beat['id'], 'text': beat['text'], 'start': start, 'duration': round(measured, 4),
                    'end': round(start + measured, 4), 'speed': round(speed, 4), 'seed': seed,
                    'audio': f'{SLUG}/{beat["id"]}.wav', 'sha256': hashlib.sha256(dest.read_bytes()).hexdigest()})
        print(f'{beat["id"]:10s} {measured:5.2f} s  (créneau {end - start:4.1f} s, ×{speed:.2f})', flush=True)
    return out, profile


def loudness(path):
    """Integrated loudness (LUFS) and peak (dBFS) with ffmpeg's ebur128 filter."""
    import re
    import subprocess
    import imageio_ffmpeg
    err = subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(), '-hide_banner', '-nostats', '-i', str(path), '-af', 'ebur128=peak=true', '-f', 'null', '-'],
                         capture_output=True, text=True, encoding='utf-8', errors='replace').stderr
    summary = err[err.rfind('Summary:'):]
    lufs = re.search(r'I:\s+(-?[\d.]+) LUFS', summary)
    peak = re.search(r'Peak:\s+(-?[\d.]+) dBFS', summary)
    return (float(lufs.group(1)) if lufs else None, float(peak.group(1)) if peak else None)


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


# Story events (seconds) mirrored from src/videos/marc-branchies/Scene3D.tsx.
PLUNGE = 4.8
JUMP = 7.2
SPLASH = 8.3
DIVE = 8.9
GILLS_OPEN = 9.4
OXYGEN = 10.8
LITRES = 18.0
BATH = 25.8
HEAVY = 31.0
SWIM = 37.8
COLD = 43.8
HYPO = 51.0
FISH = 57.8
PUNCH = 64.4
END = 69.8


def thud(rng, f0=90, length=0.5, noise=0.8):
    import numpy as np
    d = np.arange(int(length * RATE)) / RATE
    return np.sin(2 * np.pi * f0 * d) * np.exp(-d * 12) + noise * lowpass(rng.standard_normal(len(d)), 5) * np.exp(-d * 18)


def ambience(length, beats):
    import numpy as np
    rng = np.random.default_rng(75)
    n = int(length * RATE)
    t = np.arange(n) / RATE
    noise = rng.standard_normal(n)
    mix = np.zeros(n)

    under = window(t, 0, PLUNGE, 0.1) + window(t, DIVE, OXYGEN, 0.1) + window(t, LITRES, BATH, 0.2) + window(t, HEAVY, PUNCH, 0.2)

    # Music: a slow, watery plucked line (D minor); muffled (low-passed) underwater.
    music = np.zeros(n)
    chords = [[146.83, 174.61, 220.0, 293.66], [116.54, 146.83, 174.61, 233.08],
              [130.81, 164.81, 196.0, 261.63], [110.0, 138.59, 164.81, 220.0]]
    step = 60 / 88 / 2
    for k, at in enumerate(np.arange(0.3, END - 0.3, step)):
        chord = chords[(k // 8) % 4]
        add(music, at, pluck(chord[(k * 3) % 4] * 2, 0.9, rng, 0.996), 0.05)
        if k % 4 == 0:
            add(music, at, pluck(chord[0] / 2, 1.2, rng, 0.995), 0.11)
    muffled = lowpass(music, 18)
    mix += (music * (1 - under) + muffled * 1.6 * under) * smooth(0, 1.0, t)

    # Underwater: deep rumble, bubbles.
    mix += under * (lowpass(noise, 120) * 0.25 + 0.02 * np.sin(2 * np.pi * 40 * t))
    for at in rng.uniform(0, length, 70):
        if under[min(n - 1, int(at * RATE))] < 0.5:
            continue
        d = np.arange(int(0.08 * RATE)) / RATE
        add(mix, float(at), np.sin(2 * np.pi * (300 + 1400 * d / 0.08) * d) * np.exp(-d * 35), 0.04)
    # Gills: soft rhythmic whoosh, faster when he works harder.
    rate = np.where((t >= LITRES) & (t < BATH), 16, np.where((t >= HEAVY) & (t < COLD), 24, 8)) / (2 * np.pi)
    gill = (0.5 + 0.5 * np.sin(2 * np.pi * np.cumsum(rate) / RATE)) ** 4
    mix += under * gill * lowpass(noise, 25) * 0.06 * smooth(GILLS_OPEN, GILLS_OPEN + 0.5, t + (t < PLUNGE) * 100)

    # The bridge: city, wind, gulls; the jump and the splash.
    city = window(t, PLUNGE, DIVE, 0.1) + window(t, PUNCH, length, 0.3)
    mix += city * (lowpass(noise, 15) * 0.06)
    for at in (PLUNGE + 0.5, PUNCH + 1.0):
        d = np.arange(int(0.5 * RATE)) / RATE
        add(mix, at, np.sin(2 * np.pi * (1800 - 600 * d) * d) * np.sin(np.pi * d / 0.5), 0.03)
    d = np.arange(int(1.0 * RATE)) / RATE
    add(mix, JUMP + 0.1, lowpass(rng.standard_normal(len(d)), 6) * np.sin(np.pi * d / 1.0) * d, 0.08)
    d = np.arange(int(1.2 * RATE)) / RATE
    add(mix, SPLASH, lowpass(rng.standard_normal(len(d)), 3) * np.exp(-d * 4) + np.sin(2 * np.pi * 70 * d) * np.exp(-d * 8), 0.45)

    # Compare cubes: a ping per oxygen dot.
    for i in range(30):
        d = np.arange(int(0.06 * RATE)) / RATE
        add(mix, OXYGEN + 0.8 + i * 2.8 / 30, np.sin(2 * np.pi * 1800 * d) * np.exp(-d * 40), 0.025)
    d = np.arange(int(0.6 * RATE)) / RATE
    add(mix, OXYGEN + 4.2, np.sin(2 * np.pi * 330 * d) * np.exp(-d * 5), 0.06)

    # Bath: running tap.
    tap = window(t, BATH + 0.6, HEAVY - 1.0, 0.2)
    mix += tap * lowpass(noise, 4) * 0.12

    # Heartbeat slowing as he gets cold.
    for at in np.arange(COLD, PUNCH - 0.5, 1.0 + 0.6 * 0):
        slow = float(smooth(COLD, FISH, at))
        add(mix, float(at), thud(rng, 55, 0.18, 0.1), 0.15 * (0.6 + 0.4 * slow))
    # The fish swims by: a little swish.
    d = np.arange(int(0.8 * RATE)) / RATE
    add(mix, FISH + 1.5, lowpass(rng.standard_normal(len(d)), 10) * np.sin(np.pi * d / 0.8), 0.08)

    duck = np.ones(n)
    for b in beats:
        duck -= 0.7 * window(t, b['start'], b['end'], 0.2)
    mix *= np.clip(duck, 0.3, 1) * smooth(0, 0.2, t) * (1 - smooth(min(END + 4.0, length - 0.6), length, t))
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
