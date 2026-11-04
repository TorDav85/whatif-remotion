"""Voice-over (XTTS) and procedural sound design for MarcNoix, fitted to fixed visual slots."""
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

SLUG = 'marc-noix'
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
        seed = beat.get('seed', 29000 + i)
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


# Story events (seconds) mirrored from src/videos/marc-noix/Scene3D.tsx.
SHRINK = (1.0, 3.4)
SKULL = 4.8
WALNUT = 6.2
NEURONS = 11.0
CULL = (13.4, 15.6)
WORDS = 17.8
LOST = 20.4
BALANCE = 24.4
FALL = 28.6
CROW = 30.8
HOOK_TOOL = 32.6
LOOK = 34.6
DENSE = 37.8
CASE = 44.4
VENTRICLES = (46.2, 48.4)
FAMILY = 52.4
TIME = 58.4
PUNCH = 64.0
END = 66.4


def thud(rng, f0=90, length=0.5, noise=0.8):
    import numpy as np
    d = np.arange(int(length * RATE)) / RATE
    return np.sin(2 * np.pi * f0 * d) * np.exp(-d * 12) + noise * lowpass(rng.standard_normal(len(d)), 5) * np.exp(-d * 18)


def ambience(length, beats):
    import numpy as np
    rng = np.random.default_rng(74)
    n = int(length * RATE)
    t = np.arange(n) / RATE
    noise = rng.standard_normal(n)
    mix = np.zeros(n)

    # Music: a curious, light plucked pattern (E minor), brighter for the crow and the family.
    music = np.zeros(n)
    chords = [[164.81, 196.0, 246.94, 329.63], [130.81, 164.81, 196.0, 261.63],
              [146.83, 185.0, 220.0, 293.66], [123.47, 155.56, 185.0, 246.94]]
    bright = [[196.0, 246.94, 293.66, 392.0], [146.83, 185.0, 220.0, 293.66]]
    step = 60 / 100 / 2
    for k, at in enumerate(np.arange(0.3, END - 0.3, step)):
        happy = CROW <= at < CASE or FAMILY <= at < TIME or at >= PUNCH
        chord = bright[(k // 8) % 2] if happy else chords[(k // 8) % 4]
        add(music, at, pluck(chord[(k * 3) % 4] * 2, 0.7, rng, 0.995), 0.05)
        if k % 4 == 0:
            add(music, at, pluck(chord[0] / 2, 1.1, rng, 0.995), 0.11)
    mix += music * smooth(0, 1.0, t)

    # Shrinking: a falling, squeezing tone; then fluid bubbles while it floats.
    d = np.arange(int(2.4 * RATE)) / RATE
    add(mix, SHRINK[0], np.sin(2 * np.pi * np.cumsum(600 * np.exp(-d * 1.2) + 80) / RATE) * np.sin(np.pi * d / 2.4), 0.06)
    for at in rng.uniform(SKULL, NEURONS - 0.3, 10):
        d = np.arange(int(0.12 * RATE)) / RATE
        add(mix, float(at), np.sin(2 * np.pi * (500 + 900 * d) * d) * np.exp(-d * 30), 0.04)
    d = np.arange(int(0.3 * RATE)) / RATE
    add(mix, WALNUT, np.sin(2 * np.pi * 880 * d) * np.exp(-d * 12), 0.05)

    # Neurons going dark: little falling blips.
    for at in np.linspace(CULL[0], CULL[1], 18):
        d = np.arange(int(0.08 * RATE)) / RATE
        add(mix, float(at), np.sin(2 * np.pi * (1600 - 4000 * d) * d) * np.exp(-d * 40), 0.035)

    # Living room tone; the lost-word "hmm"; wobble and fall.
    room = window(t, WORDS, CROW, 0.3) + window(t, FAMILY, length, 0.3)
    mix += room * lowpass(noise, 60) * 0.03
    d = np.arange(int(0.6 * RATE)) / RATE
    add(mix, LOST + 0.6, np.sin(2 * np.pi * (440 - 120 * d) * d) * np.sin(np.pi * d / 0.6), 0.05)
    wob = window(t, BALANCE, FALL, 0.3) * np.sin(2 * np.pi * 70 * t) * (0.5 + 0.5 * np.sin(2 * np.pi * 0.5 * t))
    mix += wob * 0.03
    add(mix, FALL + 0.4, thud(rng, 70, 0.7, 1.0), 0.4)

    # Outside: birds, wind; caws for the crow.
    out = window(t, CROW, DENSE, 0.3)
    mix += out * lowpass(noise, 20) * 0.04
    for at in (CROW + 0.6, LOOK + 0.2, LOOK + 0.7):
        d = np.arange(int(0.35 * RATE)) / RATE
        f = 520 + 120 * np.sin(np.pi * d / 0.35)
        caw = np.sign(np.sin(2 * np.pi * np.cumsum(f) / RATE)) * lowpass(np.abs(rng.standard_normal(len(d))), 3) * np.sin(np.pi * d / 0.35)
        add(mix, at, caw, 0.06)
    d = np.arange(int(0.15 * RATE)) / RATE
    add(mix, HOOK_TOOL, rng.standard_normal(len(d)) * np.exp(-d * 30), 0.06)
    # Punch: the crow at the window.
    d = np.arange(int(0.35 * RATE)) / RATE
    caw = np.sign(np.sin(2 * np.pi * 560 * d)) * np.sin(np.pi * d / 0.35)
    add(mix, PUNCH + 0.3, caw, 0.05)

    # Dense cubes: sparkles filling up.
    for at in np.linspace(DENSE + 0.6, DENSE + 2.4, 16):
        d = np.arange(int(0.1 * RATE)) / RATE
        add(mix, float(at), np.sin(2 * np.pi * rng.uniform(1500, 2600) * d) * np.exp(-d * 30), 0.03)

    # MRI: the machine's knocking rhythm.
    mri = window(t, CASE, FAMILY, 0.2)
    knock = (np.sin(2 * np.pi * 6 * t) > 0.9) * np.sin(2 * np.pi * 900 * t)
    mix += mri * knock * 0.04

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
