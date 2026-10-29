"""Voice-over (XTTS) and procedural ambience for InternetOffV1, fitted to fixed visual slots."""
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

SLUG = 'internet-off'
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
    rng = np.random.default_rng(85)
    n = int(length * RATE)
    t = np.arange(n) / RATE
    noise = rng.standard_normal(n)
    rumble = lowpass(noise, 400)
    hiss = noise - lowpass(noise, 6)
    mix = np.zeros(n)

    # 0-5s: busy street (traffic rumble, horns, footsteps), cut short when the network drops.
    city = window(t, 0, 5.2, 0.4) * (1 - smooth(5.0, 7.0, t))
    mix += city * rumble * 1.2
    for at, hz in [(1.2, 415), (3.4, 349), (6.1, 392)]:
        d = np.arange(int(0.45 * RATE)) / RATE
        horn = (np.sign(np.sin(2 * np.pi * hz * d)) * 0.5 + np.sin(2 * np.pi * hz * 1.26 * d)) * np.minimum(1, d / 0.02) * np.minimum(1, (0.45 - d) / 0.05)
        add(mix, at, lowpass(horn, 6), 0.09)
    step = np.exp(-np.arange(int(0.08 * RATE)) / RATE * 60) * rng.standard_normal(int(0.08 * RATE))
    for at in np.arange(0.2, 9.0, 0.29):
        add(mix, at + rng.uniform(-0.04, 0.04), lowpass(step, 8), 0.12 * float(1 - smooth(5, 9, at)))

    # 5-15s: error beeps that thin out into silence.
    for k, at in enumerate([5.2, 5.6, 6.3, 6.6, 7.4, 8.1, 9.0, 10.2, 11.8, 13.6]):
        d = np.arange(int(0.16 * RATE)) / RATE
        hz = 880 if k % 2 == 0 else 660
        beep = np.sign(np.sin(2 * np.pi * hz * d)) * np.minimum(1, d / 0.004) * np.minimum(1, (0.16 - d) / 0.01)
        add(mix, at, lowpass(beep, 4), 0.05 * (1 - k / 12))
    d = np.arange(int(0.6 * RATE)) / RATE
    add(mix, 5.0, np.sin(2 * np.pi * (520 - 300 * d) * d) * np.exp(-d * 4), 0.06)

    # 15-25s: a few distant, deep gusts rather than a constant wind bed.
    for at in [16.5, 20.0, 23.0]:
        g = np.exp(-((t - at) / 0.9) ** 2)
        mix += g * rumble * 0.6

    # 25-70s: occasional laughter, campfire crackle, warm acoustic guitar. No noise bed.
    for at in [36.2, 41.8, 46.9, 50.7, 52.3, 53.8, 58.3, 62.0, 63.4, 66.4]:
        for p in range(4):
            dd = np.arange(int(0.12 * RATE)) / RATE
            vowel = np.sin(2 * np.pi * 240 * dd) * (0.6 + 0.4 * np.sin(2 * np.pi * 750 * dd)) * np.sin(np.pi * dd / 0.12)
            add(mix, at + p * 0.17, lowpass(vowel + 0.15 * rng.standard_normal(len(dd)), 3), 0.03 * (1 - p * 0.2))
    fire = window(t, 45.0, 50.0, 0.4)
    for at in rng.uniform(45.0, 50.0, 45):
        dd = np.arange(int(0.03 * RATE)) / RATE
        add(mix, float(at), rng.standard_normal(len(dd)) * np.exp(-dd * 160), 0.05 * float(fire[int(at * RATE)]))
    guitar = np.zeros(n)
    # Gentle I-V-vi-IV in G, one strum every two seconds, arpeggiated.
    chords = [[196.0, 246.94, 293.66, 392.0], [146.83, 220.0, 293.66, 369.99],
              [164.81, 246.94, 329.63, 392.0], [130.81, 196.0, 261.63, 329.63]]
    for k, at in enumerate(np.arange(28.0, 69.0, 2.0)):
        for j, hz in enumerate(chords[k % 4]):
            add(guitar, at + j * 0.07, pluck(hz, 2.4, rng), 0.11)
    mix += guitar * window(t, 28.5, 69.5, 2.0)

    # 70-80s: sudden silence, low tension drone, a single phone chime.
    tension = window(t, 70.3, 79.5, 0.6)
    mix += tension * (np.sin(2 * np.pi * 55 * t) + 0.5 * np.sin(2 * np.pi * 58.3 * t)) * 0.012
    for j, hz in enumerate([1318.5, 1760.0]):
        dd = np.arange(int(0.9 * RATE)) / RATE
        add(mix, 70.2 + j * 0.13, np.sin(2 * np.pi * hz * dd) * np.exp(-dd * 5), 0.09)

    # 80-85s: total silence. Duck the bed under the voice.
    duck = np.ones(n)
    for b in beats:
        duck -= 0.45 * window(t, b['start'], b['end'], 0.25)
    mix *= np.clip(duck, 0.4, 1) * (1 - smooth(79.6, 80.3, t)) * smooth(0, 0.3, t)
    peak = np.max(np.abs(mix)) or 1
    mix = np.tanh(mix / peak * 1.4) * 0.5
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
