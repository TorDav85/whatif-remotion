"""Join the two correctly articulated Morpheus phrases selected by word review."""
import hashlib
import json
import os
from pathlib import Path
import sys
import wave

ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'scripts/audio/xtts'))
from audio import ffmpeg,duration
from profiles import resolve_reference

def main():
    reference,profile=resolve_reference('morpheus')
    digest=hashlib.sha256(reference.read_bytes()).hexdigest()
    source=json.loads((ROOT/'src/videos/bus-cold/narration.json').read_text(encoding='utf-8'))
    text=next(b['text'] for b in source['beats'] if b['id']=='help')
    cache=ROOT/'.cache/bus-cold';cache.mkdir(parents=True,exist_ok=True)
    base={'split_sentences':False,'temperature':0.5,'repetition_penalty':2.0,'top_k':40,'top_p':0.85,'gpt_cond_len':6,'gpt_cond_chunk_len':3}
    recipes=[
        {'seed':13612,'spoken':'Maya lui offre son bras.','settings':{'temperature':.5,'repetition_penalty':2.0},'start':0,'end':None,'pad':.25},
        {'seed':9512,'signatureText':'Elle lui tend le bras. Ensemble, ils avancent à petits pas.','spoken':'Elle lui tend le bras, ensemble, ils avancent à petits pas.','settings':{'temperature':.65},'start':.74,'end':3.45,'pad':.10},
    ]
    os.environ.setdefault('TTS_HOME',str(ROOT/'.cache'))
    os.environ.setdefault('HF_HOME',str(ROOT/'.cache/huggingface'))
    consent=json.loads((ROOT/'.cache/xtts-cpml-accepted.json').read_text(encoding='utf-8'))
    assert consent['model']=='tts_models/multilingual/multi-dataset/xtts_v2'
    assert consent['license']=='https://tts-hub.github.io/cpml'
    os.environ['COQUI_TOS_AGREED']='1'
    tts=None;chunks=[];provenance=[]
    for n,item in enumerate(recipes):
        settings={**base,**item['settings']}
        signature_text=item.get('signatureText',text)
        signature=[signature_text,digest,item['seed'],'xtts-full-v1',settings]
        if item['spoken']!=signature_text:signature.append(item['spoken'])
        key=hashlib.sha256(json.dumps(signature).encode()).hexdigest()
        raw=cache/f'{key}.wav'
        if not raw.exists():
            import torch
            from TTS.api import TTS
            if tts is None:
                torch.set_num_threads(min(8,os.cpu_count() or 1))
                tts=TTS('tts_models/multilingual/multi-dataset/xtts_v2').to('cuda' if torch.cuda.is_available() else 'cpu')
            torch.manual_seed(item['seed'])
            tts.tts_to_file(text=item['spoken'],speaker_wav=str(reference),language='fr',file_path=str(raw),**settings)
        clean=cache/f'{key}-clean.wav'
        compact=cache/f'{key}-compact.wav'
        if not clean.exists():ffmpeg('-y','-i',raw,'-af','silenceremove=start_periods=1:start_duration=0.02:start_threshold=-42dB,areverse,silenceremove=start_periods=1:start_duration=0.04:start_threshold=-42dB,areverse,apad=pad_dur=0.12','-ar','24000',clean)
        if not compact.exists():ffmpeg('-y','-i',clean,'-af','silenceremove=stop_periods=-1:stop_duration=0.5:stop_threshold=-38dB:stop_silence=0.22,apad=pad_dur=0.1','-ar','24000',compact)
        normalized=cache/f'help-source-{n}.wav'
        ffmpeg('-y','-i',compact,'-af','atempo=1,loudnorm=I=-18:TP=-2:LRA=7','-ar','24000',normalized)
        part=cache/f'help-selected-{n}.wav'
        start,end=item['start'],item['end'] or duration(normalized)
        speed=item.get('speed',1)
        ffmpeg('-y','-i',normalized,'-af',f'atrim=start={start}:end={end},asetpts=PTS-STARTPTS,atempo={speed},afade=t=in:d=0.006,afade=t=out:st={(end-start)/speed-.012}:d=0.012,apad=pad_dur={item["pad"]}','-ar','24000',part)
        with wave.open(str(part),'rb') as f:chunks.append(f.readframes(f.getnframes()))
        provenance.append({**item,'selectedEnd':end,'sourceAudioSha256':hashlib.sha256(normalized.read_bytes()).hexdigest()})
    output=cache/'help-reviewed.wav'
    with wave.open(str(output),'wb') as f:
        f.setnchannels(1);f.setsampwidth(2);f.setframerate(24000);f.writeframes(b''.join(chunks))
    takes_path=ROOT/'src/videos/bus-cold/takes.json'
    takes=json.loads(takes_path.read_text(encoding='utf-8'))
    takes['help']={'reviewedAudio':output.relative_to(ROOT).as_posix(),'reviewedSha256':hashlib.sha256(output.read_bytes()).hexdigest(),'selectedPhrases':provenance}
    takes_path.write_text(json.dumps(takes,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print('Prises sélectionnées : Maya lui offre son bras. / Ensemble, ils avancent à petits pas.',flush=True)

if __name__=='__main__':main()
