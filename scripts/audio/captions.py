"""Caption segments synced to the voice: word timestamps (faster-whisper) mapped onto the script text.

Writes src/videos/<slug>/captions.json from voice.json. The displayed words are always the
script's words; Whisper only provides the timing. Unmatched words are interpolated between
their matched neighbours, never spread evenly over the whole line.
"""
import argparse
import difflib
import json
import os
import re
import sys
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MAX_WORDS = 5
MAX_CHARS = 26
GAP = 0.35
BREAK = re.compile(r'[.,:;?!…]$')


def norm(word):
    word = unicodedata.normalize('NFD', word.lower())
    return re.sub(r'[^a-z0-9]', '', ''.join(c for c in word if unicodedata.category(c) != 'Mn'))


def align(script, heard):
    """Give each script word a [start, end] from the heard words (same audio file)."""
    a = [norm(w) for w in script]
    b = [norm(w['text']) for w in heard]
    times = [None] * len(script)
    for block in difflib.SequenceMatcher(a=a, b=b, autojunk=False).get_matching_blocks():
        for k in range(block.size):
            h = heard[block.b + k]
            times[block.a + k] = [h['start'], h['end']]
    # Interpolate the gaps between matched neighbours.
    known = [i for i, x in enumerate(times) if x]
    if not known:
        start, end = (heard[0]['start'], heard[-1]['end']) if heard else (0.0, 1.0)
        step = (end - start) / max(1, len(script))
        return [[start + i * step, start + (i + 1) * step] for i in range(len(script))]
    def fill(i0, i1, start, end):
        """Spread script words i0..i1-1 over [start, end]."""
        n = i1 - i0
        for k in range(n):
            times[i0 + k] = [start + (end - start) * k / n, start + (end - start) * (k + 1) / n]

    first, last = known[0], known[-1]
    fill(0, first, heard[0]['start'] if heard else 0.0, times[first][0])
    for lo, hi in zip(known, known[1:]):
        fill(lo + 1, hi, times[lo][1], times[hi][0])
    fill(last + 1, len(script), times[last][1], max(times[last][1], heard[-1]['end']) if heard else times[last][1] + 0.3)
    return times


def group(words):
    segments, cur = [], []
    for i, w in enumerate(words):
        cur.append(w)
        text = ' '.join(x['text'] for x in cur)
        nxt = words[i + 1] if i + 1 < len(words) else None
        cut = (nxt is None or BREAK.search(w['text']) or len(cur) >= MAX_WORDS
               or len(text + ' ' + nxt['text']) > MAX_CHARS or nxt['start'] - w['end'] > GAP)
        if cut:
            segments.append({'start': round(cur[0]['start'], 3), 'end': round(cur[-1]['end'], 3), 'text': text})
            cur = []
    return segments


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('slug')
    parser.add_argument('--model', default='small')
    args = parser.parse_args()
    folder = ROOT / 'src/videos' / args.slug
    voice = json.loads((folder / 'voice.json').read_text(encoding='utf-8'))
    sys.path.insert(0, str(ROOT / 'scripts/audio'))
    from whisper_device import load_whisper
    model, device = load_whisper(args.model, ROOT / '.cache/audio-first/whisper')
    print(f'Whisper {args.model} sur {device}', flush=True)
    words_out, segments = [], []
    for beat in voice['beats']:
        segs, _ = model.transcribe(str(ROOT / 'public' / beat['audio']), language='fr', beam_size=5, temperature=0,
                                   word_timestamps=True, vad_filter=False, condition_on_previous_text=False)
        heard = [{'text': w.word.strip(), 'start': w.start, 'end': w.end} for s in segs for w in (s.words or [])]
        script = beat.get('caption', beat['text']).split()
        times = align(script, heard)
        dur = beat['duration']
        words = [{'beat': beat['id'], 'text': w, 'start': round(beat['start'] + min(s, dur), 3), 'end': round(beat['start'] + min(e, dur), 3)}
                 for w, (s, e) in zip(script, times)]
        matched = sum(1 for x in difflib.SequenceMatcher(a=[norm(w) for w in script], b=[norm(h['text']) for h in heard]).get_matching_blocks() for _ in range(x.size))
        print(f"{beat['id']:8s} {matched:2d}/{len(script):2d} mots calés | {' '.join(h['text'] for h in heard)}", flush=True)
        words_out += words
        segments += [{**s, 'beat': beat['id']} for s in group(words)]
    out = {'source': 'voice.json', 'method': f'faster-whisper-{args.model}-word-timestamps', 'maxWords': MAX_WORDS, 'maxChars': MAX_CHARS,
           'segments': segments, 'words': words_out}
    (folder / 'captions.json').write_text(json.dumps(out, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    print(f'OK : {len(segments)} segments -> src/videos/{args.slug}/captions.json', flush=True)


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        print(f'Erreur : {error}', file=sys.stderr, flush=True)
        sys.exit(1)
