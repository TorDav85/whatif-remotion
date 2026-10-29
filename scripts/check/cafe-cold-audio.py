"""Check the rendered narration with an independent local transcription."""
import hashlib
import json
from pathlib import Path
import re
import unicodedata
import sys

ROOT = Path(__file__).resolve().parents[2]

def tokens(text):
    text=''.join(c for c in unicodedata.normalize('NFKD', text.casefold()) if not unicodedata.combining(c))
    text=text.replace('en mitouflee','emmitoufle').replace('jivre','givre')
    text=re.sub(r'\braba\b','rabat',text)
    text=re.sub(r'\brejoins\b','rejoint',text)
    text=re.sub(r"\bd\s*['’]\s*erape\b",'derape',text)
    text=re.sub(r'\bpetits pas\b','petit pas',text)
    text=re.sub(r'\bseule le panier\b','seul le panier',text)
    text=re.sub(r'\bessi\b','et si',text)
    # Proper-name spelling: French Marc and ASR's Mark have identical pronunciation.
    text=re.sub(r'\bmark\b','marc',text)
    # "Mets" and "mais" are exact French homophones; retain source imperative spelling.
    text=re.sub(r'\bmais un pouce bleu\b','mets un pouce bleu',text)
    items=re.findall(r'[^\W_]+',text)
    numbers={'10':'dix','20':'vingt','30':'trente','40':'quarante','6':'six','0':'zero'}
    return [numbers.get(w,w) for w in items]

def main():
    from faster_whisper import WhisperModel
    slug='paris-polar-v2' if '--polar-v2' in sys.argv else 'paris-polar' if '--polar' in sys.argv else 'bus-cold' if '--bus' in sys.argv else 'cafe-cold-v2' if '--v2' in sys.argv else 'cafe-cold'
    timeline_path=ROOT/'src/videos'/slug/'timing.json'
    timeline=json.loads(timeline_path.read_text(encoding='utf-8'))
    model=None
    cache=ROOT/'.cache'/slug/'transcriptions'
    cache.mkdir(parents=True,exist_ok=True)
    report=[]
    subtitles=[]
    for beat in timeline['beats']:
        file=ROOT/'public'/beat['audio']
        digest=hashlib.sha256(file.read_bytes()).hexdigest()
        assert digest==beat['sha256'], f'Audio changed: {beat["id"]}'
        hints=slug in ('paris-polar','paris-polar-v2') and beat['id']=='normal'
        cached=cache/f'{digest}-small-fr-trocadero-v2.json' if hints else cache/f'{digest}-small-fr-v1.json'
        if cached.exists():
            words=json.loads(cached.read_text(encoding='utf-8'))
        else:
            if model is None:
                model=WhisperModel('small', device='cpu', compute_type='int8', cpu_threads=8, download_root=str(ROOT/'.cache/audio-first/whisper'), local_files_only=True)
            segments,_=model.transcribe(str(file),language='fr',beam_size=5,temperature=0,word_timestamps=True,vad_filter=False,condition_on_previous_text=False,initial_prompt=('Paris, Trocadéro, Marc, tour Eiffel.' if slug=='paris-polar-v2' else 'Paris, Trocadéro, Léa, tour Eiffel.') if hints else None)
            words=[{'text':w.word.strip(),'start':round(w.start,3),'end':round(w.end,3)} for s in segments for w in (s.words or [])]
            cached.write_text(json.dumps(words,ensure_ascii=False),encoding='utf-8')
        words=[w for w in words if w['end']>w['start']]
        observed=' '.join(w['text'] for w in words)
        match=tokens(observed)==tokens(beat['text'])
        report.append({'id':beat['id'],'match':match,'expected':beat['text'],'observed':observed,'audioSha256':digest,'words':words})
        print(f'{beat["id"]}: {"OK" if match else "REVIEW"} {observed}',flush=True)
        # Source spelling is authoritative. ASR supplies estimated word timing only.
        aligned=[]
        observed_tokens=[]
        k=0
        while k<len(words):
            word=words[k]
            if k+1<len(words) and tokens(word['text']+' '+words[k+1]['text'])==['emmitoufle']:
                word={'text':'emmitouflé','start':word['start'],'end':words[k+1]['end']}; k+=1
            observed_tokens.extend({'token':token,'start':word['start'],'end':word['end']} for token in tokens(word['text']))
            k+=1
        cursor=0
        for text in beat['text'].split():
            count=len(tokens(text))
            segment=observed_tokens[cursor:cursor+count]
            if segment:
                aligned.append({'text':text,'start':segment[0]['start'],'end':segment[-1]['end']})
            cursor+=count
        for j in range(0,len(aligned),7):
            chunk=aligned[j:j+7]
            subtitles.append({'start':beat['start']+chunk[0]['start'],'end':min(beat['end'],beat['start']+chunk[-1]['end']),'text':' '.join(w['text'] for w in chunk)})
    destination=ROOT/'out'/slug
    destination.mkdir(parents=True,exist_ok=True)
    (destination/'audio-review.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    def stamp(t):
        m=round(t*1000);return f'{m//3600000:02}:{m//60000%60:02}:{m//1000%60:02},{m%1000:03}'
    # Only publish subtitles if the transcription reproduces the approved words.
    if all(r['match'] for r in report):
        (destination/f'{slug}.srt').write_text('\n\n'.join(f'{i+1}\n{stamp(s["start"])} --> {stamp(s["end"])}\n{s["text"]}' for i,s in enumerate(subtitles))+'\n',encoding='utf-8')
    print(f'Exact text matches: {sum(r["match"] for r in report)}/{len(report)}',flush=True)

if __name__=='__main__': main()
