"""Voice-over (XTTS) and procedural sound design for AsteroideParis, fitted to fixed visual slots."""
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

SLUG = 'asteroide-paris'
IMPACT = 25.0
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
        seed = beat.get('seed', 21000 + i)
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


def ambience(length, beats):
    import numpy as np
    rng = np.random.default_rng(40)
    n = int(length * RATE)
    t = np.arange(n) / RATE
    noise = rng.standard_normal(n)
    rumble = lowpass(lowpass(noise, 300), 300)
    rumble /= np.max(np.abs(rumble)) or 1
    mix = np.zeros(n)

    # 0-14s: a calm Paris street. Short traffic swells, two horns, footsteps. No noise bed.
    for at in [0.8, 4.6, 9.2, 12.4]:
        mix += np.exp(-((t - at) / 0.8) ** 2) * rumble * 0.35
    for at, hz in [(2.2, 415), (8.4, 349)]:
        d = np.arange(int(0.35 * RATE)) / RATE
        horn = (np.sign(np.sin(2 * np.pi * hz * d)) * 0.5 + np.sin(2 * np.pi * hz * 1.26 * d)) * np.minimum(1, d / 0.02) * np.minimum(1, (0.35 - d) / 0.05)
        add(mix, at, lowpass(horn, 6), 0.06)
    step = np.exp(-np.arange(int(0.07 * RATE)) / RATE * 60) * rng.standard_normal(int(0.07 * RATE))
    for at in np.arange(3.3, 6.9, 0.4):
        add(mix, at, lowpass(step, 8), 0.12)

    # 0-25s: a low tension drone that rises in pitch and level until the impact.
    k = smooth(0, IMPACT, t)
    hz = 46 + 40 * k ** 2
    phase = 2 * np.pi * np.cumsum(hz) / RATE
    drone = (np.sin(phase) + 0.5 * np.sin(phase * 1.5) + 0.25 * np.sin(phase * 2.02)) * (0.02 + 0.1 * k ** 2)
    mix += drone * (1 - smooth(IMPACT - 0.05, IMPACT, t))

    # 7-11s: space whoosh as the rock passes the camera.
    whoosh = lowpass(noise, 12) * np.exp(-((t - 7.6) / 0.5) ** 2)
    mix += whoosh * 0.5

    # 14.8-18.5s: emergency alert (two-tone, every phone at once).
    for i, at in enumerate(np.arange(14.8, 18.4, 0.5)):
        d = np.arange(int(0.24 * RATE)) / RATE
        f = 853 if i % 2 == 0 else 960
        tone = (np.sin(2 * np.pi * f * d) + 0.4 * np.sin(2 * np.pi * f * 2 * d)) * np.minimum(1, d / 0.01) * np.minimum(1, (0.24 - d) / 0.02)
        add(mix, at, tone, 0.07)

    # 18.4-25s: heartbeat speeding up, then countdown ticks.
    beat = 18.4
    while beat < IMPACT - 0.3:
        for off, g in [(0, 0.35), (0.18, 0.22)]:
            d = np.arange(int(0.15 * RATE)) / RATE
            add(mix, beat + off, np.sin(2 * np.pi * 52 * d) * np.exp(-d * 28), g)
        beat += 0.85 - 0.4 * (beat - 18.4) / 6.6
    for at in [22.2, 23.2, 24.2]:
        d = np.arange(int(0.12 * RATE)) / RATE
        add(mix, at, np.sin(2 * np.pi * 1760 * d) * np.exp(-d * 40), 0.12)

    # 25s: the impact. A sharp crack, a huge low boom, then a long decaying rumble.
    d = np.arange(int(0.08 * RATE)) / RATE
    add(mix, IMPACT, rng.standard_normal(len(d)) * np.exp(-d * 50), 0.9)
    d = np.arange(int(4.0 * RATE)) / RATE
    add(mix, IMPACT, np.sin(2 * np.pi * (60 - 30 * d / 4) * d) * np.exp(-d * 1.1), 1.0)
    after = smooth(IMPACT, IMPACT + 0.3, t) * np.exp(-np.maximum(0, t - IMPACT) * 0.22)
    mix += after * rumble * 1.1

    # 29-37s: the blast wind, swelling as the dust wall reaches Marc. Metal creak on the tower.
    wind = lowpass(noise, 40) - lowpass(noise, 400)
    mix += wind * smooth(29, 36.5, t) * (1 - smooth(37.0, 37.4, t)) * 0.9
    for at in [29.8, 31.0]:
        d = np.arange(int(1.2 * RATE)) / RATE
        add(mix, at, np.sin(2 * np.pi * (180 - 60 * d) * d) * np.sin(2 * np.pi * 7 * d) * np.exp(-d * 2.5), 0.12)

    # 37.4s: cut to silence, one low hit on the end card.
    d = np.arange(int(1.5 * RATE)) / RATE
    add(mix, 37.6, np.sin(2 * np.pi * 55 * d) * np.exp(-d * 2.5), 0.35)

    # Duck the bed under the voice.
    duck = np.ones(n)
    for b in beats:
        duck -= 0.45 * window(t, b['start'], b['end'], 0.2)
    mix *= np.clip(duck, 0.45, 1) * smooth(0, 0.2, t) * (1 - smooth(39.4, 40, t))
    peak = np.max(np.abs(mix)) or 1
    mix = np.tanh(mix / peak * 1.6) * 0.55
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
