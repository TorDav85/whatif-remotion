"""Check rendered video and the integrity and timing of its XTTS narration."""
import hashlib
import json
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'scripts/audio/xtts'))
from generate import text_for
from audio import duration
import imageio_ffmpeg

timeline = json.loads((ROOT / 'src/videos/whatif/timeline.json').read_text(encoding='utf-8'))
directory = ROOT / 'public' / timeline['audio']['voiceDir']
manifest = json.loads((directory / 'timing.json').read_text(encoding='utf-8'))
expected = [i for i, beat in enumerate(timeline['beats']) if text_for(beat)]
assert [beat['beat'] for beat in manifest['beats']] == expected, 'Pistes manquantes dans le manifeste'
for beat in manifest['beats']:
    audio = directory / f"beat-{beat['beat']}.wav"
    assert hashlib.sha256(audio.read_bytes()).hexdigest() == beat['sha256'], f'WAV modifié : {audio}'
    assert 0.1 <= duration(audio) <= beat['end'] - beat['start'] + 0.005, f'Durée invalide : {audio}'

video = ROOT / 'out/whatif-xtts.mp4'
reader = imageio_ffmpeg.read_frames(str(video))
metadata = next(reader)
reader.close()
assert metadata['size'] == (timeline['width'], timeline['height']), 'Résolution incorrecte'
assert metadata['fps'] == timeline['fps'], 'Fréquence incorrecte'
assert abs(metadata['duration'] - timeline['duration']) < 0.05, 'Durée vidéo incorrecte'
ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
probe = subprocess.run([ffmpeg, '-hide_banner', '-i', str(video)], capture_output=True, text=True)
assert 'Audio: aac' in probe.stderr, 'Piste audio AAC manquante'
decode = subprocess.run([ffmpeg, '-v', 'error', '-i', str(video), '-f', 'null', '-'], capture_output=True, text=True)
assert decode.returncode == 0 and not decode.stderr.strip(), decode.stderr
report = {'video': str(video), 'metadata': metadata, 'validatedBeats': expected,
          'fullDecode': 'passed', 'audio': 'AAC', 'bytes': video.stat().st_size}
(ROOT / 'out/xtts-validation.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
print(json.dumps(report, indent=2))
