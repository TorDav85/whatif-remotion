"""Decode a complete release MP4 and compare its representative frame with the PNG."""
import json
from pathlib import Path
import re
import subprocess
import sys
import imageio_ffmpeg
from PIL import Image, ImageChops, ImageStat

video, spec_path, reference = map(Path, sys.argv[1:4])
spec = json.loads(spec_path.read_text(encoding='utf-8'))
ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
reader = imageio_ffmpeg.read_frames(str(video))
metadata = next(reader)
reader.close()
assert tuple(metadata['size']) == (spec['width'], spec['height']), 'Dimensions vidéo incorrectes'
assert abs(metadata['fps'] - spec['fps']) < 0.01, 'Fréquence vidéo incorrecte'
expected = round(spec['duration'] * spec['fps']) / spec['fps']
assert abs(metadata['duration'] - expected) <= 2 / spec['fps'], 'Durée vidéo incorrecte'
probe = subprocess.run([ffmpeg, '-hide_banner', '-i', str(video)], capture_output=True, text=True)
assert 'Audio: aac' in probe.stderr, 'Piste AAC absente'
decoded = subprocess.run([ffmpeg, '-v', 'error', '-threads', '2', '-i', str(video), '-f', 'null', '-'], capture_output=True, text=True)
assert decoded.returncode == 0 and not decoded.stderr.strip(), decoded.stderr
levels = subprocess.run([ffmpeg, '-hide_banner', '-i', str(video), '-vn', '-af', 'volumedetect', '-f', 'null', '-'], capture_output=True, text=True)
peak = re.search(r'max_volume: ([\-\w.]+) dB', levels.stderr)
mean = re.search(r'mean_volume: ([\-\w.]+) dB', levels.stderr)
comparison = None
if reference.exists():
    frame = spec['frame']
    extracted = video.with_suffix('.encoded-frame.png')
    r = subprocess.run([ffmpeg, '-v', 'error', '-y', '-ss', str(frame / spec['fps']), '-i', str(video),
        '-frames:v', '1', '-vf', 'scale=540:960', str(extracted)], capture_output=True, text=True)
    assert r.returncode == 0, r.stderr
    actual = Image.open(extracted).convert('RGB')
    original = Image.open(reference).convert('RGB').resize(actual.size, Image.Resampling.LANCZOS)
    comparison = sum(ImageStat.Stat(ImageChops.difference(actual, original)).mean) / 3
    assert comparison < 8, f'Écart PNG/MP4 trop élevé : {comparison:.2f}/255'
report = {'fullDecode': True, 'audio': 'AAC', 'metadata': metadata, 'bytes': video.stat().st_size,
    'maxVolumeDb': peak.group(1) if peak else None, 'meanVolumeDb': mean.group(1) if mean else None,
    'pngMp4MeanDifference': comparison}
video.with_suffix('.validation.json').write_text(json.dumps(report, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
print(json.dumps({'video': video.name, 'validated': True, 'bytes': report['bytes'], 'pngMp4MeanDifference': comparison}))
