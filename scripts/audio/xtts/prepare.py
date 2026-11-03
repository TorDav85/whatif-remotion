"""Prepare a mono WAV reference from a local recording, without changing the source."""
import argparse
import json
import tempfile
from audio import ROOT, duration, ffmpeg, project_path


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('input')
    parser.add_argument('--output', default='public/reference.wav')
    parser.add_argument('--start', type=float, default=0)
    parser.add_argument('--seconds', type=float, default=10)
    args = parser.parse_args()
    if args.start < 0 or not 6 <= args.seconds <= 30:
        parser.error('start doit être positif ; seconds doit être compris entre 6 et 30.')
    source, output = project_path(args.input), project_path(args.output)
    if not source.is_file():
        parser.error(f'Fichier introuvable : {source}')
    if source.resolve() == output.resolve():
        parser.error('La sortie doit être différente de la source.')
    output.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(dir=output.parent) as tmp:
        candidate = project_path(tmp) / 'reference.wav'
        ffmpeg('-y', '-ss', args.start, '-i', source, '-vn', '-af',
               'silenceremove=start_periods=1:start_duration=0.08:start_threshold=-45dB,'
               'loudnorm=I=-20:TP=-2:LRA=11',
               '-t', args.seconds, '-ac', 1, '-ar', 44100, '-c:a', 'pcm_s16le', candidate)
        seconds = duration(candidate)
        if seconds < 6:
            raise RuntimeError(f'Échantillon trop court : {seconds:.2f} s (minimum 6 s).')
        candidate.replace(output)
    metadata = {'source': str(source), 'start': args.start, 'duration': seconds,
                'sampleRate': 44100, 'channels': 1, 'normalization': '-20 LUFS / -2 dBTP'}
    output.with_suffix('.json').write_text(json.dumps(metadata, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f'Référence prête : {output} ({seconds:.2f} s, mono, 44 100 Hz)', flush=True)


if __name__ == '__main__':
    main()
