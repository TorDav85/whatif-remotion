"""Voice-over (XTTS) and procedural sound design for MarcInsomnie, fitted to fixed visual slots."""
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

SLUG = 'marc-insomnie'
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
        seed = beat.get('seed', 28000 + i)
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


# Story events (seconds) mirrored from src/videos/marc-insomnie/Scene3D.tsx.
NIGHT = 4.8
DAY2 = 10.8
JULIEN_IN = 12.8
FORGET = 14.4
MICRO = 16.8
MICRO_AT = [19.6, 21.9]
MICRO_LEN = 0.8
CAR = 23.8
CAR_BLINK = 25.4
CAR_BLINK_LEN = 1.0
RULER = 26.6
HALLUC = 29.4
MORPH = 32.2
RECORD = 36.0
GARDNER = 43.8
RAT = 49.4
WHY = 57.4
BRAIN = 64.8
PUNCH = 71.6
END = 75.8
BLACKOUTS = [(MICRO_AT[0], MICRO_LEN), (MICRO_AT[1], MICRO_LEN), (CAR_BLINK, CAR_BLINK_LEN)]


def thud(rng, f0=90, length=0.5, noise=0.8):
    import numpy as np
    d = np.arange(int(length * RATE)) / RATE
    return np.sin(2 * np.pi * f0 * d) * np.exp(-d * 12) + noise * lowpass(rng.standard_normal(len(d)), 5) * np.exp(-d * 18)


def ambience(length, beats):
    import numpy as np
    rng = np.random.default_rng(73)
    n = int(length * RATE)
    t = np.arange(n) / RATE
    noise = rng.standard_normal(n)
    mix = np.zeros(n)

    # Music: a slow lullaby-like pluck that drifts out of tune as the days go by; silent in blackouts.
    music = np.zeros(n)
    chords = [[196.0, 246.94, 293.66, 392.0], [164.81, 196.0, 246.94, 329.63],
              [174.61, 220.0, 261.63, 349.23], [146.83, 185.0, 220.0, 293.66]]
    step = 60 / 92 / 2
    for k, at in enumerate(np.arange(0.3, END - 0.3, step)):
        if any(a - 0.05 < at < a + l + 0.05 for a, l in BLACKOUTS):
            continue
        chord = chords[(k // 8) % 4]
        detune = 1 + 0.02 * float(smooth(HALLUC, RECORD + 5, at)) * np.sin(k * 1.7)
        add(music, at, pluck(chord[(k * 3) % 4] * 2 * detune, 0.8, rng, 0.995), 0.05)
        if k % 4 == 0:
            add(music, at, pluck(chord[0] / 2, 1.2, rng, 0.995), 0.11)
    mix += music * smooth(0, 1.0, t)

    # Night room tone and ticking clock (hook, night 1, punch).
    night = window(t, 0, DAY2, 0.3) + window(t, PUNCH, END, 0.3)
    mix += night * (np.sin(2 * np.pi * 1 * t) > 0.995) * lowpass(noise, 2) * 0.06
    # Boxes set down at night.
    for at in np.arange(NIGHT + 1.1, DAY2, 2.4):
        add(mix, float(at), thud(rng, 120, 0.25, 0.5), 0.12)
    # Door, then the forgetting "hmm" tone.
    add(mix, JULIEN_IN - 0.2, thud(rng, 80, 0.4, 0.4), 0.15)
    d = np.arange(int(0.6 * RATE)) / RATE
    add(mix, FORGET, np.sin(2 * np.pi * (440 - 120 * d) * d) * np.sin(np.pi * d / 0.6), 0.05)

    # Highway: wind and tyre roar, rumble strip when the car drifts, horn.
    road = window(t, CAR, HALLUC, 0.2)
    mix += road * (lowpass(noise, 12) * 0.12 + 0.02 * np.sin(2 * np.pi * 55 * t))
    rumble = window(t, CAR_BLINK + 0.7, CAR_BLINK + 1.3, 0.05) * np.sign(np.sin(2 * np.pi * 38 * t))
    mix += rumble * 0.05
    d = np.arange(int(0.7 * RATE)) / RATE
    add(mix, CAR_BLINK + CAR_BLINK_LEN + 0.05, (np.sign(np.sin(2 * np.pi * 420 * d)) + np.sign(np.sin(2 * np.pi * 530 * d))) * 0.5 * np.minimum(1, d * 20), 0.06)

    # Night street: hum; the sign turns into a man: low swell and a sting.
    street = window(t, HALLUC, RECORD, 0.3)
    mix += street * lowpass(noise, 40) * 0.05
    swell = window(t, MORPH - 0.3, MORPH + 1.2, 0.4)
    mix += swell * np.sin(2 * np.pi * np.cumsum(60 + 40 * smooth(MORPH, MORPH + 1.0, t)) / RATE) * 0.08
    d = np.arange(int(0.9 * RATE)) / RATE
    add(mix, MORPH + 0.6, sum(np.sin(2 * np.pi * f * d) for f in (622, 659, 880)) * np.exp(-d * 4), 0.05)

    # Day 11: pen strokes on the calendar.
    for i in range(11):
        d = np.arange(int(0.12 * RATE)) / RATE
        add(mix, RECORD + 0.45 + i * 0.42, lowpass(rng.standard_normal(len(d)), 2) * np.sin(np.pi * d / 0.12), 0.08)

    # 1964: crackling record and soft snoring.
    archive = window(t, GARDNER, RAT, 0.2)
    crackle = (rng.random(n) > 0.9995) * rng.standard_normal(n)
    mix += archive * (crackle * 0.3 + lowpass(noise, 80) * 0.03)
    for at in np.arange(GARDNER + 0.6, RAT - 0.5, 2.2):
        d = np.arange(int(1.2 * RATE)) / RATE
        add(mix, float(at), lowpass(rng.standard_normal(len(d)), 20) * np.sin(np.pi * d / 1.2) ** 2, 0.12)

    # Lab: hum and water; a low drone grows as the rat gets colder.
    lab = window(t, RAT, BRAIN, 0.3)
    mix += lab * (np.sin(2 * np.pi * 100 * t) * 0.015 + lowpass(noise, 30) * 0.03)
    cold = window(t, WHY, BRAIN, 0.4) * smooth(WHY, BRAIN, t)
    mix += cold * np.sin(2 * np.pi * 47 * t) * 0.05

    # Brain: soft electric blips, crunches when connections get eaten.
    brain = window(t, BRAIN, PUNCH, 0.3)
    blip = (np.sin(2 * np.pi * 3.1 * t) > 0.985) * np.sin(2 * np.pi * 1800 * t)
    mix += brain * blip * 0.03
    for at in np.linspace(BRAIN + 2.2, BRAIN + 5.8, 9):
        d = np.arange(int(0.15 * RATE)) / RATE
        add(mix, float(at), lowpass(rng.standard_normal(len(d)), 3) * np.exp(-d * 20), 0.08)

    # Blackouts: everything drops out under a faint high ring.
    for a, l in BLACKOUTS:
        gap = window(t, a, a + l, 0.05)
        mix *= 1 - 0.9 * gap
        mix += gap * np.sin(2 * np.pi * 3200 * t) * 0.01

    duck = np.ones(n)
    for b in beats:
        duck -= 0.7 * window(t, b['start'], b['end'], 0.2)
    mix *= np.clip(duck, 0.3, 1) * smooth(0, 0.2, t) * (1 - smooth(END + 4.0, length, t))
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
