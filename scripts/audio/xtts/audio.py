"""Local audio utilities shared by reference preparation and XTTS generation."""
from pathlib import Path
import subprocess
import wave

ROOT = Path(__file__).resolve().parents[3]


def ffmpeg(*args):
    import imageio_ffmpeg
    result = subprocess.run(
        [imageio_ffmpeg.get_ffmpeg_exe(), '-hide_banner', '-loglevel', 'error', '-nostdin', *map(str, args)],
        capture_output=True, text=True,
    )
    if result.returncode:
        raise RuntimeError(result.stderr.strip())


def duration(path):
    with wave.open(str(path), 'rb') as audio:
        return audio.getnframes() / audio.getframerate()


def project_path(value):
    path = Path(value)
    return path if path.is_absolute() else ROOT / path
