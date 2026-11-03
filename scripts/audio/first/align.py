"""Isolated CPU ASR worker: avoids mixing CTranslate2 and PyTorch CUDA DLLs on Windows."""
import argparse
import json
import os
from pathlib import Path
import sys


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--jobs', required=True)
    args = parser.parse_args()
    jobs_path = Path(args.jobs)
    jobs = json.loads(jobs_path.read_text(encoding='utf-8'))
    model = None
    results = {}
    for item in jobs['items']:
        alignment_file = Path(item['alignmentFile'])
        if alignment_file.exists():
            data = json.loads(alignment_file.read_text(encoding='utf-8'))
        else:
            if jobs.get('manual'):
                raise ValueError(f'Alignement manuel absent : {alignment_file}')
            from faster_whisper import WhisperModel
            if model is None:
                print(f"Transcription isolée {jobs['model']}, CPU int8, mots horodatés.", flush=True)
                model = WhisperModel(jobs['model'], device='cpu', compute_type='int8', cpu_threads=min(8, os.cpu_count() or 1), download_root=jobs['downloadRoot'])
            segments, _ = model.transcribe(item['file'], language='fr', beam_size=5, temperature=0,
                                           word_timestamps=True, vad_filter=False, condition_on_previous_text=False)
            words = [{'text': word.word.strip(), 'start': word.start, 'end': word.end} for segment in segments for word in (segment.words or [])]
            data = {'audioSha256': item['audioSha256'], 'method': f"faster-whisper-{jobs['model']}-word-transcription",
                    'reviewed': False, 'observedText': ' '.join(word['text'] for word in words), 'words': words}
            alignment_file.parent.mkdir(parents=True, exist_ok=True)
            temporary = alignment_file.with_suffix('.tmp.json')
            temporary.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')
            temporary.replace(alignment_file)
        if jobs.get('manual') and data.get('reviewed') is not True:
            raise ValueError(f"{item['id']} : reviewed=true requis après contrôle manuel.")
        print(f"{item['id']}: {data.get('observedText', 'alignement manuel')}", flush=True)
        results[item['id']] = data
    jobs_path.with_suffix('.result.json').write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding='utf-8')


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        print(f'Erreur de transcription : {error}', file=sys.stderr, flush=True)
        sys.exit(1)
