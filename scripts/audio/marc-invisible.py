"""Voice-over (XTTS) and procedural sound design for MarcInvisible, fitted to fixed visual slots."""
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

SLUG = 'marc-invisible'
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
        seed = beat.get('seed', 27000 + i)
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


# Story events (seconds) mirrored from src/videos/marc-invisible/Scene3D.tsx.
HOOK_FADE = (0.8, 3.0)
MORNING = 4.8
HANDS = 6.6
ARMS = 8.0
BODY = 9.4
SHOCK = 12.6
SIP = 13.4
EYE = 15.8
EYE_MARC = 19.4
POV = 23.4
DARK = (24.0, 25.2)
CHAIR = 26.8
STREET = 29.0
BIKE = 33.2
HEAT = 35.8
CCTV = 43.0
CCTV_POV = 45.0
LOCK = 45.8
LUNCH = 49.2
BITES = [51.4, 52.2, 53.0]
DIGEST = 56.4
HOURS = (56.8, 61.8)
PUNCH = 62.6
PUNCH_HEAT = 65.8
END = 69.6


def shimmer(rng, length=1.4, down=True):
    """Glassy falling (or rising) sparkle for things vanishing."""
    import numpy as np
    d = np.arange(int(length * RATE)) / RATE
    k = -0.35 if down else 0.35
    return sum(np.sin(2 * np.pi * f * d * (1 + k * d)) for f in (1320, 1760, 2640)) * np.sin(np.pi * d / length) ** 2


def thud(rng, f0=90, length=0.5, noise=0.8):
    import numpy as np
    d = np.arange(int(length * RATE)) / RATE
    return np.sin(2 * np.pi * f0 * d) * np.exp(-d * 12) + noise * lowpass(rng.standard_normal(len(d)), 5) * np.exp(-d * 18)


def ambience(length, beats):
    import numpy as np
    rng = np.random.default_rng(72)
    n = int(length * RATE)
    t = np.arange(n) / RATE
    noise = rng.standard_normal(n)
    mix = np.zeros(n)

    # Music: a light, sneaky plucked line (A minor), cut while his sight goes, back for the street.
    music = np.zeros(n)
    chords = [[220.0, 261.63, 329.63, 440.0], [174.61, 220.0, 261.63, 349.23],
              [196.0, 246.94, 293.66, 392.0], [164.81, 207.65, 246.94, 329.63]]
    step = 60 / 104 / 2
    for k, at in enumerate(np.arange(0.3, END - 0.3, step)):
        if DARK[0] < at < STREET - 0.3:
            continue
        chord = chords[(k // 8) % 4]
        if k % 2 == 0 or at > STREET:
            add(music, at, pluck(chord[(k * 3) % 4] * 2, 0.7, rng, 0.995), 0.05)
        if k % 4 == 0:
            add(music, at, pluck(chord[0] / 2, 1.1, rng, 0.995), 0.11)
    mix += music * smooth(0, 1.0, t)

    # Kitchen room tone, street hum.
    kitchen = window(t, 0, EYE, 0.3) + window(t, POV, STREET, 0.3) + window(t, LUNCH, PUNCH, 0.3)
    mix += kitchen * lowpass(noise, 60) * 0.03
    street = window(t, STREET, LUNCH, 0.3) + window(t, PUNCH, length, 0.5)
    mix += street * (lowpass(noise, 25) * 0.07 + 0.01 * np.sin(2 * np.pi * 70 * t))

    # Vanishing: one sparkle per stage.
    for at, g in [(HOOK_FADE[0] + 0.2, 0.05), (HANDS, 0.04), (ARMS, 0.04), (BODY, 0.05)]:
        add(mix, at, shimmer(rng), g)
    # Julien's gasp: a short rising squeak; the sip.
    d = np.arange(int(0.3 * RATE)) / RATE
    add(mix, SHOCK, np.sin(2 * np.pi * (500 + 900 * d) * d) * np.sin(np.pi * d / 0.3), 0.05)
    add(mix, SIP + 0.5, lowpass(rng.standard_normal(int(0.5 * RATE)), 3) * 0.6, 0.05)

    # The eye: rays travelling (soft rising tone), a ping when light lands on the retina.
    for at in (EYE + 0.6, EYE_MARC + 0.5):
        d = np.arange(int(1.8 * RATE)) / RATE
        add(mix, at, np.sin(2 * np.pi * (300 + 200 * d) * d) * np.sin(np.pi * d / 1.8) ** 2, 0.035)
    d = np.arange(int(0.8 * RATE)) / RATE
    add(mix, EYE + 0.6 + 8.25 / 4.5, np.sin(2 * np.pi * 1568 * d) * np.exp(-d * 6), 0.06)
    # Lights out: a low falling drone into silence.
    dark = window(t, DARK[0], DARK[1] + 0.3, 0.3)
    mix += dark * np.sin(2 * np.pi * np.cumsum(80 - 40 * smooth(DARK[0], DARK[1], t)) / RATE) * 0.05

    # Chair crash, mug breaking.
    add(mix, CHAIR, thud(rng, 110, 0.5), 0.35)
    for c in rng.uniform(CHAIR + 0.45, CHAIR + 0.7, 12):
        d = np.arange(int(0.06 * RATE)) / RATE
        add(mix, float(c), np.sin(2 * np.pi * rng.uniform(2500, 4500) * d) * np.exp(-d * 70), 0.06)

    # Bike: freewheel ticking, bell, impact.
    tick = window(t, STREET + 0.5, BIKE, 0.3) * (np.sin(2 * np.pi * 9 * t) > 0.92)
    mix += tick * lowpass(noise, 2) * 0.05
    d = np.arange(int(0.9 * RATE)) / RATE
    bell = (np.sin(2 * np.pi * 2100 * d) + 0.5 * np.sin(2 * np.pi * 3150 * d)) * np.exp(-d * 5)
    add(mix, BIKE - 1.4, bell, 0.05)
    add(mix, BIKE - 1.0, bell, 0.05)
    add(mix, BIKE, thud(rng, 70, 0.7, 1.0), 0.45)
    for c in rng.uniform(BIKE + 0.1, BIKE + 0.6, 10):
        d = np.arange(int(0.05 * RATE)) / RATE
        add(mix, float(c), np.sin(2 * np.pi * rng.uniform(800, 1600) * d) * np.exp(-d * 60), 0.08)

    # Thermal camera: a low electronic hum while the image is thermal; beeps on the lock.
    thermal = window(t, HEAT, CCTV, 0.1) + window(t, CCTV_POV, LUNCH, 0.1) + window(t, PUNCH_HEAT, END, 0.1)
    mix += thermal * (np.sin(2 * np.pi * 120 * t) * 0.02 + np.sin(2 * np.pi * 240 * t) * 0.008)
    d = np.arange(int(0.12 * RATE)) / RATE
    for k in range(3):
        add(mix, LOCK + k * 0.2, np.sin(2 * np.pi * 1760 * d), 0.05)
    # Servo of the police camera turning.
    d = np.arange(int(1.3 * RATE)) / RATE
    add(mix, CCTV + 0.3, np.sin(2 * np.pi * (220 + 40 * np.sin(2 * np.pi * 3 * d)) * d) * np.sin(np.pi * d / 1.3), 0.03)

    # Lunch: crunchy bites, a gulp per bite, stomach gurgles during the digestion.
    for at in BITES:
        d = np.arange(int(0.18 * RATE)) / RATE
        add(mix, at, rng.standard_normal(len(d)) * np.exp(-d * 25), 0.12)
        d = np.arange(int(0.25 * RATE)) / RATE
        add(mix, at + 0.5, np.sin(2 * np.pi * (180 - 120 * d) * d) * np.sin(np.pi * d / 0.25), 0.1)
    for at in np.arange(HOURS[0], HOURS[1], 1.3):
        d = np.arange(int(0.6 * RATE)) / RATE
        f = 90 + 60 * np.sin(2 * np.pi * 7 * d)
        add(mix, float(at), np.sin(2 * np.pi * np.cumsum(f) / RATE) * np.sin(np.pi * d / 0.6), 0.07)
    # Clock ticking through the time-lapse.
    tick = window(t, HOURS[0], HOURS[1], 0.2) * (np.sin(2 * np.pi * 4 * t) > 0.97)
    mix += tick * lowpass(noise, 2) * 0.05

    # Punch: cane tapping, stamp.
    for at in np.arange(PUNCH + 0.3, END - 0.3, 60 / 104):
        add(mix, float(at), thud(rng, 900, 0.08, 0.3), 0.06)
    add(mix, PUNCH_HEAT + 0.7, thud(rng, 60, 0.4, 0.6), 0.3)

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
