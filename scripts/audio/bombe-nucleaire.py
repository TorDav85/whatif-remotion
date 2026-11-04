"""French XTTS narration and deterministic sound design for BombeNucleaire."""
import argparse
import hashlib
import json
import os
import re
import subprocess
import sys
import wave
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'scripts/audio/xtts'))
from audio import duration, ffmpeg
from profiles import resolve_reference

SLUG = 'bombe-nucleaire'
# Artistic montage clock, matching Scene3D. Not physical propagation times.
IMPACT, SHOCK, SHELTER, FALLOUT = 8.0, 18.0, 34.0, 40.0
RADIO_STOP, HANDLE, BLACKOUT = 50.0, 55.5, 58.5
KNOCKS = (50.5, 51.2, 52.0)
DOOR_FILTER = 'highpass=f=150,lowpass=f=2200,aecho=0.8:0.7:38:0.09'
DOOR_TAIL = 0.038
MODEL = 'tts_models/multilingual/multi-dataset/xtts_v2'
SETTINGS = {'split_sentences': False, 'temperature': 0.5, 'repetition_penalty': 2.0,
            'top_k': 40, 'top_p': 0.85, 'gpt_cond_len': 6, 'gpt_cond_chunk_len': 3}
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
    previous_path = ROOT / 'src/videos' / SLUG / 'voice.json'
    previous = json.loads(previous_path.read_text(encoding='utf-8')) if previous_path.exists() else {}
    previous_beats = {b['id']: b for b in previous.get('beats', [])}
    tts, out = None, []
    for i, beat in enumerate(story['beats']):
        seed = beat.get('seed', 73000 + i)
        key = hashlib.sha256(json.dumps([beat['text'], ref_hash, seed, SETTINGS, MODEL]).encode()).hexdigest()
        start, end = beat['slot']
        effect = DOOR_FILTER if beat['id'] == 'julien' else None
        signature = hashlib.sha256(json.dumps([key, effect]).encode()).hexdigest()
        dest = folder / f'{beat["id"]}.wav'
        old = previous_beats.get(beat['id'])
        # Preserve accepted lines byte-for-byte, including the shortened radio slot.
        # Any text/seed/effect/voice/hash change invalidates the final-file cache.
        if (not args.force and old and dest.exists() and previous.get('voice') == profile
                and old.get('text') == beat['text'] and old.get('seed') == seed
                and old.get('start') == start and old.get('effect') == effect
                and old.get('signature', signature) == signature
                and old.get('sha256') == hashlib.sha256(dest.read_bytes()).hexdigest()
                and duration(dest) <= end - start + .01):
            out.append({**old, 'signature': signature, '_cached': True})
            print(f'{beat["id"]:10s} réutilisé sans réécriture ({duration(dest):.2f} s)', flush=True)
            continue
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
        natural = duration(clean)
        # Reserve the real echo tail in the slot; never truncate a voice to fit it.
        available = end - start - (DOOR_TAIL + .015 if effect else 0)
        speed = max(1.0, natural / available)
        if speed > MAX_SPEED:
            raise RuntimeError(f'{beat["id"]} : {natural:.2f} s pour {end-start:.2f} s '
                               f'(×{speed:.2f}). Raccourcir le texte ou changer de seed.')
        filters = f'atempo={speed:.6f},' + (f'{effect},' if effect else '') + 'loudnorm=I=-16:TP=-1.5:LRA=7'
        ffmpeg('-y', '-i', clean, '-af', filters,
               '-ac', '1', '-ar', '24000', dest)
        measured = duration(dest)
        out.append({'id': beat['id'], 'text': beat['text'], 'start': start, 'duration': round(measured, 4),
                    'end': round(start + measured, 4), 'speed': round(speed, 4), 'seed': seed,
                    'effect': effect, 'signature': signature,
                    'audio': f'{SLUG}/{beat["id"]}.wav', 'sha256': hashlib.sha256(dest.read_bytes()).hexdigest()})
        print(f'{beat["id"]:10s} {measured:5.2f} s / {end-start:4.1f} s (×{speed:.2f})', flush=True)
    return out, profile


def even_out(beats):
    """Measure short lines after loudnorm, then bring each to -16 LUFS."""
    import imageio_ffmpeg
    for beat in beats:
        if beat.pop('_cached', False):
            continue
        path = ROOT / 'public' / beat['audio']
        log = subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(), '-hide_banner', '-nostats', '-i', str(path),
                              '-af', 'ebur128', '-f', 'null', '-'], capture_output=True, text=True,
                             encoding='utf-8', errors='replace', check=True).stderr
        lufs = float(re.search(r'I:\s+(-?[\d.]+) LUFS', log[log.rfind('Summary:'):]).group(1))
        gain = -16.0 - lufs
        if abs(gain) > 0.25:
            temp = path.with_suffix('.tmp.wav')
            ffmpeg('-y', '-i', path, '-af', f'volume={gain:.3f}dB,alimiter=limit=0.89:level=false',
                   '-ac', '1', '-ar', '24000', temp)
            temp.replace(path)
        beat['sha256'] = hashlib.sha256(path.read_bytes()).hexdigest()
        beat['duration'] = round(duration(path), 4)
        beat['end'] = round(beat['start'] + beat['duration'], 4)
        print(f'{beat["id"]:10s} {lufs:5.1f} LUFS, correction {gain:+.2f} dB', flush=True)


def smooth(a, b, x):
    import numpy as np
    k = np.clip((x - a) / (b - a), 0, 1)
    return k * k * (3 - 2 * k)


def lowpass(values, size):
    import numpy as np
    # Moving average in linear time, even for the long low-frequency impacts.
    padded = np.pad(values, (size // 2, size - 1 - size // 2))
    total = np.concatenate(([0.0], np.cumsum(padded)))
    return (total[size:] - total[:-size]) / size


def ambience(length, beats):
    import numpy as np
    rng = np.random.default_rng(73000)
    n = round(length * RATE)
    t = np.arange(n) / RATE
    mix = np.zeros(n)

    def add(at, sound, gain=1.0):
        i = round(at * RATE)
        count = min(len(sound), n - i)
        if count > 0:
            mix[i:i + count] += sound[:count] * gain

    def noise(seconds, cutoff=12, decay=2.0):
        d = np.arange(round(seconds * RATE)) / RATE
        return lowpass(rng.standard_normal(len(d)), cutoff) * np.exp(-decay * d)

    def tone(at, hz, seconds, gain, decay=2.0):
        d = np.arange(round(seconds * RATE)) / RATE
        add(at, np.sin(2 * np.pi * hz * d) * np.exp(-decay * d) * smooth(0, .025, d), gain)

    # The opening has small identifiable city sounds and a sparse low musical pulse.
    for at in [0.35, 3.0, 6.15]:
        d = np.arange(round(1.6 * RATE)) / RATE
        add(at, lowpass(rng.standard_normal(len(d)), 110) * np.sin(np.pi * d / 1.6) ** 2, .13)
    for at in np.arange(4.1, 7.7, .47):
        add(at, noise(.1, 20, 32), .20)
    for at, hz in [(0, 65.4), (4, 58.3), (7.0, 49.0)]:
        tone(at, hz, 2, .055, .8)
        tone(at, hz * 1.5, 1.7, .018, 1.5)

    # Flash: a brief cut in sound. The heavy boom comes with the later shock-wave shot.
    mix *= 1 - smooth(7.93, IMPACT, t)
    tone(8.3, 1100, 2.0, .012, 1.8)
    for at in [13.0, 14.3, 16.4]:
        add(at, noise(.8, 14, 3), .10)
    d = np.arange(round(3.8 * RATE)) / RATE
    add(SHOCK, np.sin(2 * np.pi * (49 * d - 2.4 * d ** 2)) * np.exp(-1.35 * d), .7)
    add(SHOCK, noise(2.7, 500, 1.3), 1.1)
    add(SHOCK + .035, noise(.16, 2, 30), .3)
    for at in [18.4, 19.1, 20.8, 22.0, 29.2, 31.2]:
        add(at, noise(.5, 9, 9), .17)
        tone(at + .03, 740 + 50 * rng.random(), .12, .012, 28)

    # The cloud/ruins have sparse decaying notes, not a continuous white-noise bed.
    for at, hz in [(24.0, 55.0), (28.2, 49.0), (32.3, 43.65), (40.0, 65.4), (44.5, 58.3)]:
        tone(at, hz, 4.5, .055, .65)
        tone(at + .07, hz * 2.01, 2.4, .012, 1.3)
    for at in np.arange(SHELTER + .15, 37.9, .36):
        add(at, noise(.1, 35, 36), .14)
    add(38.3, noise(.35, 170, 10), .26)
    tone(38.3, 70, .45, .12, 9)
    # A radio switch, tuning and a short thin hiss establish the shelter interior.
    # This stops before the knocks: those three impacts carry the scene alone.
    add(46.1, noise(.09, 3, 38), .12)
    add(46.3, noise(.35, 7, 8), .07)
    tone(46.4, 880, .12, .012, 30)
    d = np.arange(round(3.3 * RATE)) / RATE
    radio = (lowpass(rng.standard_normal(len(d)), 4) - lowpass(rng.standard_normal(len(d)), 50))
    radio *= smooth(0, .08, d) * (1 - smooth(3.05, 3.3, d))
    add(46.7, radio, .012)
    add(RADIO_STOP, noise(.045, 4, 80), .04)

    # Three knuckles against a heavy door: short attack, deep body and a muted
    # metallic ring. Distinct attacks match the door movement in the 3D scene.
    for at, pitch, gain in zip(KNOCKS, [1.0, .97, 1.025], [.85, .8, .92]):
        d = np.arange(round(.27 * RATE)) / RATE
        attack = smooth(0, .0012, d)
        body = (np.sin(2 * np.pi * 96 * pitch * d) * np.exp(-d * 27)
                + .34 * np.sin(2 * np.pi * 178 * pitch * d) * np.exp(-d * 38)
                + .11 * np.sin(2 * np.pi * 430 * d) * np.exp(-d * 42))
        contact = lowpass(rng.standard_normal(len(d)), 12) * np.exp(-d * 75)
        add(at, attack * (body + .5 * contact), gain)

    # The handle answers the knock; no extra musical cue explains the mystery.
    add(HANDLE, noise(.09, 7, 55), .09)
    d = np.arange(round(.5 * RATE)) / RATE
    handle = (np.sin(2 * np.pi * (145 * d - 22 * d ** 2))
              + .2 * np.sin(2 * np.pi * 365 * d)) * np.exp(-d * 9) * smooth(0, .015, d)
    add(HANDLE + .025, handle, .035)

    duck = np.ones(n)
    for beat in beats:
        active = smooth(beat['start'] - .12, beat['start'], t) * (1 - smooth(beat['end'], beat['end'] + .18, t))
        duck -= .78 * active
    mix *= np.clip(duck, .22, 1) * smooth(0, .12, t) * (1 - smooth(BLACKOUT - .4, BLACKOUT - .2, t))
    mix = np.tanh(mix * 1.2)
    right = np.concatenate((mix[132:], np.zeros(132)))
    data = (np.clip(np.stack((mix, right), axis=1), -1, 1) * 32767).astype('<i2')
    folder = ROOT / 'public' / SLUG
    folder.mkdir(parents=True, exist_ok=True)
    raw = ROOT / '.cache' / SLUG / 'ambience-raw.wav'
    raw.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(raw), 'wb') as out:
        out.setnchannels(2)
        out.setsampwidth(2)
        out.setframerate(RATE)
        out.writeframes(data.tobytes())
    dest = folder / 'ambience.wav'
    ffmpeg('-y', '-i', raw, '-af', 'loudnorm=I=-26:TP=-4:LRA=12', '-ac', '2', '-ar', str(RATE), dest)
    return f'{SLUG}/ambience.wav'


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--voice', help='Profil vocal local; sinon le profil actif')
    parser.add_argument('--force', action='store_true')
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
