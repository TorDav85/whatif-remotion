"""Voice-over (XTTS) and procedural sound design for MarcFour, fitted to fixed visual slots."""
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

SLUG = 'marc-four'
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


# Story events (seconds) mirrored from src/videos/marc-four/Scene3D.tsx.
DOOR_CLOSE = 8.0
MINUTES = [21.0, 32.0, 39.0, 46.4, 57.6]  # temperature doubles
KNOCKS = [22.2, 22.6, 23.0, 24.4, 24.8, 25.2]
FIRE = 40.2
POPCORN = (53.4, 57.0)
CRUMBLE = (60.6, 64.0)
DOOR_OPEN = 69.8
SNEEZE = 72.6
END = 80.8


def ambience(length, beats):
    import numpy as np
    rng = np.random.default_rng(47)
    n = int(length * RATE)
    t = np.arange(n) / RATE
    noise = rng.standard_normal(n)
    mix = np.zeros(n)

    # Music: bouncy plucked bass and arpeggio, cartoon style; it stops dead when Marc crumbles.
    music = np.zeros(n)
    chords = [[130.81, 164.81, 196.0, 261.63], [174.61, 220.0, 261.63, 349.23],
              [196.0, 246.94, 293.66, 392.0], [130.81, 164.81, 196.0, 261.63]]
    step = 60 / 116 / 2
    for k, at in enumerate(np.arange(0.3, CRUMBLE[0] - 0.4, step)):
        chord = chords[(k // 8) % 4]
        add(music, at, pluck(chord[(k * 3) % 4] * 2, 0.6, rng, 0.99), 0.06)
    for k, at in enumerate(np.arange(0.3, CRUMBLE[0] - 0.4, step * 2)):
        add(music, at, pluck(chords[(k // 4) % 4][0] / 2, 0.8, rng, 0.993), 0.13)
    for k, at in enumerate(np.arange(75.0, END - 0.6, step)):
        chord = chords[(k // 8) % 4]
        add(music, at, pluck(chord[(k * 3) % 4] * 2, 0.6, rng, 0.99), 0.06)
        if k % 2 == 0:
            add(music, at, pluck(chord[0] / 2, 0.8, rng, 0.993), 0.13)
    mix += music * smooth(0, 1.0, t)

    # Oven hum and fan from the door closing until it opens: pitch and level rise with the heat.
    heat = np.zeros(n)
    for i, at in enumerate(MINUTES):
        heat += smooth(at, at + 1.2, t)
    hz = 70 * (1 + 0.18 * heat)
    phase = 2 * np.pi * np.cumsum(hz) / RATE
    oven = window(t, DOOR_CLOSE, DOOR_OPEN, 0.4)
    fan = lowpass(lowpass(noise, 40), 40)
    fan /= np.max(np.abs(fan)) or 1
    mix += oven * (np.sin(phase) + 0.4 * np.sin(2 * phase)) * (0.03 + 0.012 * heat)
    mix += oven * fan * (0.05 + 0.04 * heat)

    # Door slam, then a timer ding at each doubling.
    d = np.arange(int(0.3 * RATE)) / RATE
    add(mix, DOOR_CLOSE, np.sin(2 * np.pi * 90 * d) * np.exp(-d * 18) + lowpass(rng.standard_normal(len(d)), 3) * np.exp(-d * 30), 0.35)
    for at in MINUTES:
        d = np.arange(int(1.2 * RATE)) / RATE
        ding = (np.sin(2 * np.pi * 1568 * d) + 0.4 * np.sin(2 * np.pi * 3136 * d)) * np.exp(-d * 4)
        add(mix, at, ding, 0.12)
    # Knocks on the glass.
    for at in KNOCKS:
        d = np.arange(int(0.12 * RATE)) / RATE
        add(mix, at, np.sin(2 * np.pi * 220 * d) * np.exp(-d * 45) + 0.4 * rng.standard_normal(len(d)) * np.exp(-d * 120), 0.3)
    # Sizzle and steam from minute 2, fire crackle from minute 3.
    sizzle = noise - lowpass(noise, 4)
    mix += window(t, 32.0, CRUMBLE[1], 0.6) * sizzle * 0.025 * (0.5 + 0.5 * smooth(32, 50, t))
    d = np.arange(int(0.9 * RATE)) / RATE
    add(mix, FIRE, lowpass(rng.standard_normal(len(d)), 2) * np.sin(np.pi * d / 0.9) ** 0.5, 0.25)  # whoomp
    for at in rng.uniform(FIRE, CRUMBLE[0], 140):
        d = np.arange(int(0.02 * RATE)) / RATE
        add(mix, float(at), rng.standard_normal(len(d)) * np.exp(-d * 250), 0.08)
    # Popcorn pops.
    for at in rng.uniform(*POPCORN, 26):
        d = np.arange(int(0.05 * RATE)) / RATE
        add(mix, float(at), lowpass(rng.standard_normal(len(d)), 2) * np.exp(-d * 90), 0.18)
    # Crumbling into dust: a long sandy hiss.
    sand = lowpass(noise, 3)
    mix += window(t, CRUMBLE[0], CRUMBLE[1], 0.3) * sand * 0.12
    for at in rng.uniform(*CRUMBLE, 50):
        d = np.arange(int(0.03 * RATE)) / RATE
        add(mix, float(at), rng.standard_normal(len(d)) * np.exp(-d * 120), 0.06)
    # Door creak, then a cartoon sneeze: a rising "ah" and a sharp "tchoum".
    d = np.arange(int(1.0 * RATE)) / RATE
    creak = np.sin(2 * np.pi * np.cumsum(300 + 150 * np.sin(2 * np.pi * 3 * d)) / RATE) * np.sin(np.pi * d) ** 2
    add(mix, DOOR_OPEN, creak, 0.05)
    d = np.arange(int(0.9 * RATE)) / RATE
    ah = np.sin(2 * np.pi * np.cumsum(220 + 260 * d) / RATE) * np.sin(np.pi * d / 0.9) ** 2
    add(mix, SNEEZE - 1.0, ah, 0.08)
    d = np.arange(int(0.35 * RATE)) / RATE
    add(mix, SNEEZE, (rng.standard_normal(len(d)) - lowpass(rng.standard_normal(len(d)), 3)) * np.exp(-d * 12), 0.45)

    duck = np.ones(n)
    for b in beats:
        duck -= 0.45 * window(t, b['start'], b['end'], 0.2)
    mix *= np.clip(duck, 0.45, 1) * smooth(0, 0.2, t) * (1 - smooth(END + 2.5, length, t))
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
