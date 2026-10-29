"""Generate the approved café story first; derive every shot from measured audio."""
import hashlib
import json
import math
import os
from pathlib import Path
import argparse
import sys
import wave
import shutil

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'scripts/audio/xtts'))
from audio import duration, ffmpeg
from profiles import resolve_reference


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--preset',action='store_true')
    parser.add_argument('--voice')
    parser.add_argument('--version',choices=['v1','v2'],default='v1')
    parser.add_argument('--story',choices=['cafe','bus','polar','polar-v2'],default='cafe')
    parser.add_argument('--prepare-only',action='store_true')
    args=parser.parse_args()
    if args.voice and args.preset:
        parser.error('Choose a named voice or the preset, not both.')
    os.environ.setdefault('TTS_HOME', str(ROOT / '.cache'))
    os.environ.setdefault('HF_HOME', str(ROOT / '.cache/huggingface'))
    consent = ROOT / '.cache/xtts-cpml-accepted.json'
    if not consent.exists():
        raise RuntimeError('XTTS license acceptance is required; use the existing voice setup.')
    accepted = json.loads(consent.read_text(encoding='utf-8'))
    if accepted.get('model') != 'tts_models/multilingual/multi-dataset/xtts_v2' or accepted.get('license') != 'https://tts-hub.github.io/cpml':
        raise RuntimeError('XTTS license acceptance does not match this model.')
    os.environ['COQUI_TOS_AGREED'] = '1'
    bus=args.story=='bus'
    polar=args.story in ('polar','polar-v2')
    dramatic=bus or polar
    slug='paris-polar-v2' if args.story=='polar-v2' else 'paris-polar' if polar else 'bus-cold' if bus else 'cafe-cold' if args.version=='v1' else 'cafe-cold-v2'
    source = ROOT/'src/videos'/('cafe-cold' if not dramatic else slug)/'narration.json'
    story = json.loads(source.read_text(encoding='utf-8'))
    folder = ROOT / 'public' / slug
    folder.mkdir(parents=True, exist_ok=True)
    reference, profile = resolve_reference(args.voice)
    # The built-in French demo speaker provides a consistent alternative when a
    # cloned reference introduces long pauses or repetitions in short sentences.
    preset = 'Ana Florence' if args.preset else None
    if preset:
        profile = preset
    ref_hash = preset or hashlib.sha256(reference.read_bytes()).hexdigest()
    cache = ROOT / '.cache' / slug
    cache.mkdir(parents=True, exist_ok=True)
    tts = None
    raw = []
    takes_path=ROOT/'src/videos'/slug/'takes.json'
    takes=json.loads(takes_path.read_text(encoding='utf-8')) if takes_path.exists() else {}
    for i, beat in enumerate(story['beats']):
        take=takes.get(beat['id'], {})
        if isinstance(take,dict) and take.get('reviewedAudio'):
            reviewed=(ROOT/take['reviewedAudio']).resolve()
            if not reviewed.is_relative_to((ROOT/'.cache'/slug).resolve()): raise RuntimeError('Reviewed audio must remain in this story cache.')
            if hashlib.sha256(reviewed.read_bytes()).hexdigest()!=take['reviewedSha256']: raise RuntimeError('Reviewed edit has changed.')
            raw.append((beat,reviewed,duration(reviewed)))
            print(f'{beat["id"]}: {duration(reviewed):.2f}s (prises sélectionnées)',flush=True)
            continue
        seed = take.get('seed',(15100 if polar else 8100 if bus else 4100)+i) if isinstance(take,dict) and (dramatic or args.version=='v2') else take if isinstance(take,int) else (9100 if beat['id'] in ['coffee','frost'] else 3100)+i
        settings={'split_sentences':False,'temperature':0.6,'repetition_penalty':7.0,'top_k':40,'top_p':0.85} if args.version=='v2' else {}
        if dramatic: settings={'split_sentences':False,'temperature':0.5,'repetition_penalty':2.0,'top_k':40,'top_p':0.85,'gpt_cond_len':6,'gpt_cond_chunk_len':3}
        if isinstance(take,dict): settings.update(take.get('settings',{}))
        spoken_text=take.get('spokenText',beat['text']) if isinstance(take,dict) else beat['text']
        key_parts=[beat['text'], ref_hash, seed, 'xtts-full-v1']
        if settings: key_parts.append(settings)
        if spoken_text!=beat['text']: key_parts.append(spoken_text)
        key = hashlib.sha256(json.dumps(key_parts).encode()).hexdigest()
        wav = cache / f'{key}.wav'
        for previous_slug in ['paris-polar','cafe-cold-v2'] if dramatic else []:
            previous=ROOT/'.cache'/previous_slug/f'{key}.wav'
            if not wav.exists() and previous.exists(): shutil.copyfile(previous,wav)
        if not wav.exists():
            import torch
            from TTS.api import TTS
            if tts is None:
                torch.set_num_threads(min(8, os.cpu_count() or 1))
                device = 'cuda' if torch.cuda.is_available() else 'cpu'
                print(f'Voix active : {profile}; XTTS {device}', flush=True)
                tts = TTS('tts_models/multilingual/multi-dataset/xtts_v2').to(device)
            torch.manual_seed(seed)
            kwargs = {'speaker':preset} if preset else {'speaker_wav':str(reference)}
            tts.tts_to_file(text=spoken_text, language='fr', file_path=str(wav), **kwargs, **settings)
        # Remove only padded silence, with a small natural breath retained.
        clean = cache / f'{key}-clean.wav'
        if not clean.exists():
            ffmpeg('-y', '-i', wav, '-af', 'silenceremove=start_periods=1:start_duration=0.02:start_threshold=-42dB,areverse,silenceremove=start_periods=1:start_duration=0.04:start_threshold=-42dB,areverse,apad=pad_dur=0.12', '-ar', '24000', clean)
        if preset and beat['id'] == 'coffee':
            # Independent ASR located the complete approved sentence at 0–1.50s
            # for this cached seed. Remove the model's spurious trailing syllables.
            edited=cache/f'{key}-reviewed.wav'
            if not edited.exists():
                ffmpeg('-y','-i',clean,'-af','atrim=end=1.53,afade=t=out:st=1.50:d=0.03,apad=pad_dur=0.12','-ar','24000',edited)
            clean=edited
        if dramatic or args.version=='v2':
            compact=cache/f'{key}-compact.wav'
            if not compact.exists():
                ffmpeg('-y','-i',clean,'-af','silenceremove=stop_periods=-1:stop_duration=0.5:stop_threshold=-38dB:stop_silence=0.22,apad=pad_dur=0.1','-ar','24000',compact)
            clean=compact
        raw.append((beat, clean, duration(clean)))
        print(f'{beat["id"]}: {duration(clean):.2f}s', flush=True)
    total = sum(item[2] for item in raw)
    pauses = {'hook':0.3,'normal':0.4,'sunny':0.65,'chill':0.35,'jacket':0.6,'coffee':0.35,'guests':0.7,'blanket':0.75,'frost':0.6,'shadow':0.5,'offer':0.5,'rise':1.1,'inside':0.65,'chair':0.6,'punchline':0}
    if dramatic: pauses={b['id']:b.get('pause',0.2) for b in story['beats']}
    gaps = sum(pauses.values())
    # Preserve natural delivery when it fits. A modest global pace adjustment only if > 70s.
    target=68.5 if dramatic else 66.0
    speed = 1 if args.prepare_only else max(1, total / (target - gaps - 3.0 - 0.45))
    if speed > 1.28:
        raise RuntimeError(f'La voix exige une nouvelle prise plus courte : {total:.1f}s, facteur {speed:.2f}.')
    lead = 0.45
    cursor = lead
    timeline = []
    for beat, clean, _ in raw:
        cursor=max(cursor,beat.get('startAt',cursor))
        dest = folder / f'{beat["id"]}.wav'
        ffmpeg('-y', '-i', clean, '-af', f'atempo={speed},loudnorm=I=-18:TP=-2:LRA=7', '-ar', '24000', dest)
        measured = duration(dest)
        timeline.append({**beat, 'start': round(cursor, 5), 'duration': measured, 'end': round(cursor+measured, 5), 'audio': f'{slug}/{beat["id"]}.wav', 'sha256': hashlib.sha256(dest.read_bytes()).hexdigest()})
        cursor += measured + pauses[beat['id']]
    length = max(58, math.ceil((cursor+3.0)*30)/30)
    result = {'fps':30, 'width':1080, 'height':1920, 'duration':length, 'voice':profile, 'voiceReferenceSha256':None if preset else ref_hash, 'pace':speed, 'lead':lead, 'ambience':f'{slug}/ambience.wav', 'provisional':args.prepare_only, 'beats':timeline}
    (ROOT / 'src/videos' / slug / 'timing.json').write_text(json.dumps(result, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    # Quiet original café / wind bed: no existing story audio is recycled.
    import numpy as np
    rate = 24000
    t = np.arange(math.ceil(length*rate))/rate
    rng = np.random.default_rng(36)
    noise = rng.standard_normal(len(t))
    wind = np.convolve(noise, np.ones(120)/120, mode='same')
    cold = np.clip((t-12)/32, 0, 1)
    bed = wind*(0.04+cold*0.16)*(0.7+0.3*np.sin(t*0.9)**2)
    # Sparse original notes, replaced by street and bus sounds for the second story.
    for at, hz in ([] if dramatic else [(1,261.63),(2,329.63),(3,392),(6,293.66),(7,349.23),(8,440),(12,261.63),(13,329.63),(14,392)]):
        dt=np.maximum(t-at,0)
        note=(np.sin(2*np.pi*hz*dt)+0.25*np.sin(2*np.pi*2*hz*dt))*np.exp(-dt*3)*(t>=at)
        bed += note*0.018
    for id in ([] if dramatic else ['coffee','inside']):
        at=next(b['start'] for b in timeline if b['id']==id)+0.25
        dt=np.maximum(t-at,0)
        bed += 0.035*np.sin(2*np.pi*1450*dt)*np.exp(-dt*27)*(t>=at)
    if bus:
        starts={b['id']:b['start'] for b in timeline}
        arrival=np.clip((t-starts['arrival'])/4,0,1)
        inside=np.clip((t-starts['inside'])/1.2,0,1)
        bed=bed*(1-inside*0.72)
        bed+=(0.008*np.sin(2*np.pi*56*t)+0.004*np.sin(2*np.pi*113*t))*arrival
        for name in ['stop','cane']:
            dt=np.maximum(t-starts[name]-0.25,0)
            if name=='stop': bed+=noise*0.022*np.exp(-dt*2)*(t>=starts[name]+0.25)
            else: bed+=(0.07*np.sin(2*np.pi*920*dt)+0.025*noise)*np.exp(-dt*27)*(t>=starts[name]+0.25)
        for at_step in np.arange(starts['help']+0.5,starts['outside'],0.65):
            dt=np.maximum(t-at_step,0)
            bed+=0.014*noise*np.exp(-dt*23)*(t>=at_step)
        dt=np.maximum(t-starts['shared'],0)
        for hz in [196,246.94,293.66]:
            bed+=0.012*np.sin(2*np.pi*hz*dt)*np.exp(-dt*0.9)*(t>=starts['shared'])
    if polar:
        starts={b['id']:b['start'] for b in timeline}
        storm=np.clip((t-starts['wind'])/(starts['deep']-starts['wind']),0,1)
        gust=(.55+.45*np.sin(t*.55+np.sin(t*.18))**2)
        bed=wind*(.07+storm*.55)*gust+noise*(.001+storm*.004)
        bed+=(np.sin(2*np.pi*43*t)+.35*np.sin(2*np.pi*67*t))*.014*storm
        for name,hz in [('slip' if args.story=='polar-v2' else 'bike',380),('traffic',160),('escape' if args.story=='polar-v2' else 'rescue',270)]:
            dt=np.maximum(t-starts[name]-.5,0)
            bed+=.035*noise*np.exp(-dt*7)*(t>=starts[name]+.5)
            bed+=.018*np.sin(2*np.pi*hz*dt)*np.exp(-dt*6)*(t>=starts[name]+.5)
        # Fountain hiss and sparse city tones recede into the blizzard.
        bed+=noise*.009*(1-storm)
        for at_note,hz in [(1,392),(2,493.88),(3,587.33)]:
            dt=np.maximum(t-at_note,0)
            bed+=.012*np.sin(2*np.pi*hz*dt)*np.exp(-dt*3)*(t>=at_note)
    fade=np.minimum(np.clip(t/0.7,0,1),np.clip((length-t)/1.2,0,1))
    samples=(np.clip(bed*fade,-0.95,0.95)*32767).astype('<i2')
    with wave.open(str(folder/'ambience.wav'),'wb') as f:
        f.setnchannels(1); f.setsampwidth(2); f.setframerate(rate); f.writeframes(samples.tobytes())
    print(f'TIMELINE : {length:.2f}s ; voix {profile} ; débit ×{speed:.3f}', flush=True)


if __name__ == '__main__':
    main()
