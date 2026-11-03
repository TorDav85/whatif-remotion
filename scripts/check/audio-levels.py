"""Mix check of one video: loudness of each voice line, ambience under the voice vs between lines,
and (optionally) the rendered MP4's loudness and peak.

    npm run audio:levels -- marc-geant-court [out/marc-geant-court/marc-geant-court-45s.mp4]
"""
import json
import re
import subprocess
import sys
import wave
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'scripts/audio/xtts'))


def ffmpeg_exe():
    import imageio_ffmpeg
    return imageio_ffmpeg.get_ffmpeg_exe()


def loudness(path):
    """Integrated loudness (LUFS) and true peak (dBTP) with ffmpeg's ebur128 filter."""
    out = subprocess.run([ffmpeg_exe(), '-hide_banner', '-nostats', '-i', str(path), '-af', 'ebur128=peak=true', '-f', 'null', '-'],
                         capture_output=True, text=True, encoding='utf-8', errors='replace').stderr
    summary = out[out.rfind('Summary:'):]
    lufs = re.search(r'I:\s+(-?[\d.]+) LUFS', summary)
    peak = re.search(r'Peak:\s+(-?[\d.]+) dBFS', summary)
    return (float(lufs.group(1)) if lufs else None, float(peak.group(1)) if peak else None)


def rms_db(x):
    return 20 * np.log10(max(1e-9, float(np.sqrt(np.mean(x ** 2)))))


def main():
    slug = sys.argv[1]
    mp4 = sys.argv[2] if len(sys.argv) > 2 else None
    voice = json.loads((ROOT / 'src/videos' / slug / 'voice.json').read_text(encoding='utf-8'))
    lines = []
    for b in voice['beats']:
        lufs, peak = loudness(ROOT / 'public' / b['audio'])
        lines.append(lufs)
        print(f"voix {b['id']:10s} {lufs:6.1f} LUFS  crête {peak:5.1f} dB")
    spread = max(lines) - min(lines)
    print(f'Écart entre répliques : {spread:.1f} LU' + ('  (! > 3 LU : homogénéiser)' if spread > 3 else '  (ok)'))

    with wave.open(str(ROOT / 'public' / voice['ambience']), 'rb') as f:
        rate = f.getframerate()
        amb = np.frombuffer(f.readframes(f.getnframes()), dtype='<i2').reshape(-1, f.getnchannels()).mean(axis=1) / 32767
    t = np.arange(len(amb)) / rate
    under = np.zeros(len(amb), bool)
    for b in voice['beats']:
        under |= (t >= b['start']) & (t < b['end'])
    gaps = ~under & (t > 0.5) & (t < t[-1] - 1)
    duck = rms_db(amb[gaps]) - rms_db(amb[under])
    voice_db = np.mean(lines)
    print(f'Ambiance sous la voix : {rms_db(amb[under]):.1f} dBFS RMS ; entre les répliques : {rms_db(amb[gaps]):.1f} dBFS ; atténuation {duck:.1f} dB'
          + ('  (! < 4 dB : la voix risque d\'être couverte)' if duck < 4 else '  (ok)'))
    result = {'slug': slug, 'voiceLufs': lines, 'voiceSpreadLu': round(spread, 1), 'ambienceDuckDb': round(duck, 1), 'voiceMeanLufs': round(voice_db, 1)}
    if mp4:
        lufs, peak = loudness(ROOT / mp4)
        result.update({'mixLufs': lufs, 'mixPeakDb': peak})
        print(f'Mix final {mp4} : {lufs:.1f} LUFS, crête {peak:.1f} dB' + ('  (! saturation)' if peak is not None and peak > -0.5 else '  (ok)'))
    out = ROOT / 'out' / 'audio-levels'
    out.mkdir(parents=True, exist_ok=True)
    (out / f'{slug}.json').write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')


if __name__ == '__main__':
    main()
