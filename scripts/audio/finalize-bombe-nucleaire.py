"""Normalize the finished film's mix, preserve its video, and verify the local MP4."""
import json
from pathlib import Path
import re
import subprocess
import sys

import imageio_ffmpeg

ROOT = Path(__file__).resolve().parents[2]
EXE = imageio_ffmpeg.get_ffmpeg_exe()


def run(*args):
    result = subprocess.run([EXE, '-hide_banner', '-nostdin', *map(str, args)],
                            capture_output=True, text=True, encoding='utf-8', errors='replace')
    if result.returncode:
        raise RuntimeError(result.stderr[-4000:])
    return result.stderr


def measure(path):
    log = run('-i', path, '-vn', '-af', 'loudnorm=I=-16:TP=-1.5:LRA=7:print_format=json', '-f', 'null', '-')
    match = re.search(r'\{\s*"input_i"[\s\S]*?\}', log)
    if not match:
        raise RuntimeError('FFmpeg did not return a loudness measurement.')
    return json.loads(match.group(0))


def main():
    source = ROOT / (sys.argv[1] if len(sys.argv) > 1 else 'out/bombe-nucleaire/bombe-nucleaire-60s-v3.mp4')
    if not source.is_file():
        raise RuntimeError(f'Render the film first: {source}')
    measured = measure(source)
    filt = ('loudnorm=I=-16:TP=-1.5:LRA=7:linear=true:'
            f'measured_I={measured["input_i"]}:measured_TP={measured["input_tp"]}:'
            f'measured_LRA={measured["input_lra"]}:measured_thresh={measured["input_thresh"]}:'
            f'offset={measured["target_offset"]}')
    staged = source.with_name(f'{source.stem}.mixing.mp4')
    run('-y', '-i', source, '-map', '0:v:0', '-map', '0:a:0', '-c:v', 'copy', '-af', filt,
        '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-movflags', '+faststart', staged)
    # Decode both streams before replacing our new render with the normalized mix.
    decode = run('-v', 'info', '-i', staged, '-map', '0:v:0', '-map', '0:a:0', '-f', 'null', '-')
    video = re.search(r'Video: h264[^\n]*?\b([1-9]\d{1,4})x([1-9]\d{1,4})\b[^\n]*?\b([\d.]+) fps', decode)
    clock = re.search(r'Duration: (\d+):(\d+):([\d.]+)', decode)
    if video is None or clock is None or 'Audio: aac' not in decode:
        raise RuntimeError('Expected H.264 video and AAC audio metadata not found.')
    width, height, fps = int(video[1]), int(video[2]), float(video[3])
    seconds = int(clock[1]) * 3600 + int(clock[2]) * 60 + float(clock[3])
    if (width, height, fps) != (1080, 1920, 30.0) or abs(seconds - 60) > 0.1:
        raise RuntimeError(f'Unexpected film format: {width}x{height}, {fps} fps, {seconds} s')
    final = measure(staged)
    if float(final['input_tp']) > -1.0:
        raise RuntimeError(f'True peak too high after encoding: {final["input_tp"]} dBTP')
    staged.replace(source)
    report = {'video': str(source.relative_to(ROOT)), 'width': width, 'height': height, 'fps': fps,
              'durationSeconds': seconds, 'videoCodec': 'h264', 'audioCodec': 'aac',
              'fullDecode': 'passed', 'mixLufs': float(final['input_i']),
              'mixPeakDbtp': float(final['input_tp']), 'bytes': source.stat().st_size,
              'beforeNormalization': measured}
    (source.parent / 'media-check.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    print(f'Film contrôlé : {width}×{height}, {fps:g} i/s, {seconds:g} s, H.264 + AAC', flush=True)
    print(f'Mix final : {report["mixLufs"]:.1f} LUFS, {report["mixPeakDbtp"]:.1f} dBTP ; décodage complet OK', flush=True)


if __name__ == '__main__':
    main()
