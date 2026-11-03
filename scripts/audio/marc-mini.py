"""Voice-over (XTTS) and procedural sound design for MarcMini, fitted to fixed visual slots."""
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

SLUG = 'marc-mini'
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


# Shrink events (seconds) mirrored from src/videos/marc-mini/Scene3D.tsx.
SHRINK = [6.0, 12.0, 18.0, 25.0, 33.0, 40.2, 41.4, 47.4, 48.4, 49.4, 54.4, 55.6, 56.8, 61.3, 64.0,
          69.2, 70.8, 72.4, 75.4, 76.4, 77.4, 78.3, 79.1]
END = 80.6


def ambience(length, beats):
    import numpy as np
    rng = np.random.default_rng(84)
    n = int(length * RATE)
    t = np.arange(n) / RATE
    noise = rng.standard_normal(n)
    mix = np.zeros(n)

    # Music: plucked arpeggio that climbs one octave as Marc enters the micro world, fading before the end card.
    music = np.zeros(n)
    chords = [[110.0, 164.81, 220.0, 261.63], [87.31, 130.81, 174.61, 220.0],
              [130.81, 196.0, 261.63, 329.63], [98.0, 146.83, 196.0, 246.94]]
    step = 60 / 104 / 2
    for k, at in enumerate(np.arange(0.4, END - 1.6, step)):
        chord = chords[(k // 8) % 4]
        hz = chord[k % 4] * (2 if at > 40 else 1)
        add(music, at, pluck(hz, 1.2, rng, 0.994), 0.05 + 0.05 * min(1, at / 60))
    for k, at in enumerate(np.arange(0.4, END - 1.6, step * 8)):
        add(music, at, pluck(chords[k % 4][0] / 2, 3.0, rng, 0.998), 0.12)
    mix += music * smooth(0, 1.5, t) * (1 - smooth(END - 1.8, END - 1.2, t))

    # A soft clock tick every second: the minutes keep running.
    for at in np.arange(0.5, END - 1.6, 1.0):
        d = np.arange(int(0.03 * RATE)) / RATE
        add(mix, at, np.sin(2 * np.pi * 2400 * d) * np.exp(-d * 180), 0.05)

    # Each halving: a falling whoosh into a small bright "pop".
    for at in SHRINK:
        d = np.arange(int(0.9 * RATE)) / RATE
        sweep = np.sin(2 * np.pi * np.cumsum(900 - 700 * d / 0.9) / RATE) * np.sin(np.pi * d / 0.9) ** 2
        add(mix, at - 0.2, sweep, 0.12)
        add(mix, at - 0.3, lowpass(rng.standard_normal(len(d)), 6) * np.sin(np.pi * d / 0.9) ** 2, 0.2)
        d = np.arange(int(0.12 * RATE)) / RATE
        add(mix, at + 0.6, np.sin(2 * np.pi * (1400 + 2600 * d) * d) * np.exp(-d * 45), 0.25)

    # 0-12s: street life, short swells only. A horn and the bus.
    rumble = lowpass(lowpass(noise, 300), 300)
    rumble /= np.max(np.abs(rumble)) or 1
    for at in [1.0, 5.0, 9.5]:
        mix += np.exp(-((t - at) / 0.8) ** 2) * rumble * 0.3
    d = np.arange(int(0.4 * RATE)) / RATE
    horn = np.sign(np.sin(2 * np.pi * 392 * d)) * np.minimum(1, d / 0.02) * np.minimum(1, (0.4 - d) / 0.05)
    add(mix, 8.6, lowpass(horn, 6), 0.05)
    # 12-18s: pigeon coos and wing flaps.
    for at in [13.3, 15.6, 17.0]:
        d = np.arange(int(0.5 * RATE)) / RATE
        coo = np.sin(2 * np.pi * (330 + 40 * np.sin(2 * np.pi * 7 * d)) * d) * np.sin(np.pi * d / 0.5) ** 2
        add(mix, at, coo, 0.12)
    for at in [12.4, 12.9, 13.4, 13.9, 14.4]:
        d = np.arange(int(0.04 * RATE)) / RATE
        add(mix, at, rng.standard_normal(len(d)) * np.exp(-d * 120), 0.05)

    # 40-47s: the ant's tiny legs ticking.
    for at in np.arange(40.4, 45.2, 0.09):
        d = np.arange(int(0.012 * RATE)) / RATE
        add(mix, float(at + rng.uniform(0, 0.03)), rng.standard_normal(len(d)) * np.exp(-d * 400), 0.04)
    # 47-61s: grains crunching as the world grows.
    for at in rng.uniform(47.4, 60.5, 40):
        d = np.arange(int(0.06 * RATE)) / RATE
        add(mix, float(at), lowpass(rng.standard_normal(len(d)), 3) * np.exp(-d * 60), 0.05)

    # 61-80s: the micro world. Watery bubbles, then a shimmering atom tone.
    for at in rng.uniform(61.3, 75.0, 30):
        d = np.arange(int(0.15 * RATE)) / RATE
        hz = rng.uniform(300, 700)
        add(mix, float(at), np.sin(2 * np.pi * (hz + 900 * d) * d) * np.exp(-d * 30), 0.05)
    micro = window(t, 61.3, END - 1.4, 1.0)
    mix += micro * (np.sin(2 * np.pi * 55 * t) + 0.6 * np.sin(2 * np.pi * 82.4 * t)) * 0.025
    atom = window(t, 76.0, END - 1.4, 1.0)
    mix += atom * (np.sin(2 * np.pi * 880 * t) + np.sin(2 * np.pi * 1318.5 * t)) * (0.5 + 0.5 * np.sin(2 * np.pi * 3 * t)) * 0.02

    # Duck under the voice; the end card keeps only the voice.
    duck = np.ones(n)
    for b in beats:
        duck -= 0.45 * window(t, b['start'], b['end'], 0.2)
    mix *= np.clip(duck, 0.45, 1) * smooth(0, 0.2, t) * (1 - smooth(END - 0.6, END, t))
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
