"""Voice-over (XTTS) and procedural flight sound design for AvionPortance (holo style), fitted to fixed visual slots."""
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

SLUG = 'avion-portance'
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
        seed = beat.get('seed', 32000 + i)
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


# Story clock, copied from src/videos/avion-portance/Scene3D.tsx (drives the sound events).
WEIGHT = 6.2
WING = 13.2
RUNWAY = 22.4
LIFTOFF = 27.4
STALL = 31.2
RECOVER = 33.6
RULE = 34.2
END = 41.2
RADAR = [0.3, 2.2, 4.1]
BLIPS = [3.4, WEIGHT + 0.6, WEIGHT + 3.4, WING + 0.6, LIFTOFF, 36.0, 38.0, END]


def env(t, at, attack, decay):
    """Percussive envelope starting at `at`."""
    import numpy as np
    x = t - at
    return np.where(x < 0, 0.0, np.minimum(1.0, x / max(attack, 1e-4)) * np.exp(-np.maximum(0.0, x - attack) / decay))


def lowpass(x, cutoff):
    """One-pole low-pass, cutoff (Hz) may vary per sample."""
    import numpy as np
    a = 1 - np.exp(-2 * np.pi * np.asarray(cutoff, dtype=float) / RATE)
    a = np.broadcast_to(a, x.shape)
    y = np.empty_like(x)
    acc = 0.0
    for i in range(len(x)):
        acc += a[i] * (x[i] - acc)
        y[i] = acc
    return y


def ambience(length, beats):
    """Flight sound design: hum of the hologram, wind in the wind tunnel, engines on the runway, stall horn."""
    import numpy as np
    rng = np.random.default_rng(32)
    n = int(length * RATE)
    t = np.arange(n) / RATE
    out = np.zeros((n, 2))
    noise = rng.standard_normal(n)

    # Engines: filtered noise + a turbine whine; full power on the runway, cruise elsewhere, off at the end.
    power = (0.25 * window(t, 0, WING, 0.6) + 1.0 * window(t, RUNWAY, LIFTOFF + 1.5, 0.3)
             + 0.6 * window(t, LIFTOFF + 1.5, STALL, 0.5) + 0.35 * window(t, RECOVER, END + 2, 0.6))
    cutoff = 300 + 1500 * power
    roar = lowpass(noise, cutoff) * 0.35 * power
    whine_f = 900 + 1400 * power
    whine = np.sin(2 * np.pi * np.cumsum(whine_f) / RATE) * 0.015 * power
    out += np.stack([roar + whine, np.roll(roar, 29) + whine], 1)

    # Wind tunnel: airy noise during the wing cross-section.
    wind = lowpass(rng.standard_normal(n), 900) * 0.25 * window(t, WING, RUNWAY - 0.3, 0.5)
    out += np.stack([wind, np.roll(wind, 113)], 1)

    # Radar pings (hook).
    for i, at in enumerate(RADAR):
        x = t - at
        f = 1500 - 500 * np.clip(x / 0.25, 0, 1)
        ping = np.sin(2 * np.pi * np.cumsum(f) / RATE) * env(t, at, 0.004, 0.22) * 0.16
        echo = np.roll(ping, int(0.18 * RATE)) * 0.4
        pan = 0.65 if i % 2 else 0.35
        out[:, 0] += (ping + echo) * (1 - pan)
        out[:, 1] += (ping + echo) * pan

    # HUD blips.
    for at in BLIPS:
        blip = (np.sin(2 * np.pi * 880 * t) + 0.5 * np.sin(2 * np.pi * 1320 * t)) * env(t, at, 0.003, 0.08) * 0.1
        out += np.stack([blip, blip], 1)

    # Stall horn: repeated two-tone beeps while the wing stalls, plus a short glitch stutter.
    horn = np.zeros(n)
    for at in np.arange(STALL - 0.4, RECOVER - 0.3, 0.32):
        horn += np.sign(np.sin(2 * np.pi * 740 * t)) * window(t, at, at + 0.16, 0.01)
    out += np.stack([horn, horn], 1) * 0.05
    stutter = np.sign(np.sin(2 * np.pi * 30 * t)) * noise * window(t, STALL - 0.05, STALL + 0.25, 0.02) * 0.12
    out += np.stack([stutter, -stutter], 1)

    # Rule: two soft chimes.
    for at, f0 in [(36.0, 660), (38.0, 520)]:
        chime = (np.sin(2 * np.pi * f0 * t) + 0.4 * np.sin(2 * np.pi * f0 * 2.01 * t)) * env(t, at, 0.005, 0.6) * 0.09
        out += np.stack([chime, chime], 1)

    out *= 0.5 / max(1e-6, np.abs(out).max())
    duck = np.ones(n)
    for b in beats:
        duck -= 0.7 * window(t, b['start'], b['end'], 0.2)
    out *= (np.clip(duck, 0.3, 1) * (1 - smooth(length - 0.8, length - 0.1, t)))[:, None]
    stereo = (np.clip(out, -1, 1) * 32767).astype('<i2')
    dest = ROOT / 'public' / SLUG / 'ambience.wav'
    dest.parent.mkdir(parents=True, exist_ok=True)
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
