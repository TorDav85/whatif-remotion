"""Validate the final export, measured audio files, and full MP4 decoding."""
import hashlib
import json
from pathlib import Path
import subprocess
import sys

ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'scripts/audio/xtts'))
from audio import duration
import imageio_ffmpeg

v2='--v2' in sys.argv
bus='--bus' in sys.argv
dense='--dense' in sys.argv
polar_v2='--polar-v2' in sys.argv or dense
polar='--polar' in sys.argv or polar_v2
slug='paris-polar-v2' if polar_v2 else 'paris-polar' if polar else 'bus-cold' if bus else 'cafe-cold-v2' if v2 else 'cafe-cold'
timeline=json.loads((ROOT/'src/videos'/slug/'timing.json').read_text(encoding='utf-8'))
assert not timeline.get('provisional'),'Unfinalized narration'
if v2 or bus or polar:
    assert timeline['voice']=='morpheus','Wrong voice'
    assert timeline['voiceReferenceSha256']==hashlib.sha256((ROOT/'voice-samples/morpheus/reference.wav').read_bytes()).hexdigest(),'Wrong voice reference'
last=0
for beat in timeline['beats']:
    file=ROOT/'public'/beat['audio']
    assert hashlib.sha256(file.read_bytes()).hexdigest()==beat['sha256'],beat['id']
    assert abs(duration(file)-beat['duration'])<0.002,beat['id']
    assert beat['start']>=last and beat['end']<=timeline['duration'],beat['id']
    last=beat['end']
review=json.loads((ROOT/'out'/slug/'audio-review.json').read_text(encoding='utf-8'))
assert all(b['match'] for b in review),'Narration needs review'
assert len(review)==len(timeline['beats'])
for b,r in zip(timeline['beats'],review):
    assert b['sha256']==r['audioSha256'],'Review is stale'
if polar:
    cta=next(b for b in timeline['beats'] if b['id']=='cta')
    assert 'abonne' in cta['text'] and 'commentaire' in cta['text'] and any(w in cta['text'].casefold() for w in ['like',"j'aime",'pouce bleu']),'Missing spoken CTA'
    assert timeline['duration']-last>=2,'Missing quiet final image'
    if polar_v2:
        assert 8<=cta['start']<=12,'CTA must start around 10 seconds'
        assert 'like' in cta['text'] and 'pouce' not in cta['text'],'Wrong spoken like CTA'
        narration=' '.join(b['text'] for b in timeline['beats'])
        assert 'Marc' in narration and not any(w in narration.casefold() for w in ['vélo','panier','léa','père']),'Wrong protagonist or old bike narration'
video=ROOT/'out'/('paris-polar-v3' if dense else slug)/('paris-catastrophe-polaire-v3-paris-dense.mp4' if dense else 'paris-catastrophe-polaire-v2-marc.mp4' if polar_v2 else 'paris-catastrophe-polaire-morpheus.mp4' if polar else 'le-prochain-bus-morpheus.mp4' if bus else 'la-place-au-soleil-v2-morpheus.mp4' if v2 else 'la-place-au-soleil.mp4')
reader=imageio_ffmpeg.read_frames(str(video))
metadata=next(reader);reader.close()
assert metadata['size']==(timeline['width'],timeline['height'])
assert metadata['fps']==timeline['fps']
assert abs(metadata['duration']-timeline['duration'])<0.08
assert 50<=metadata['duration']<=70
exe=imageio_ffmpeg.get_ffmpeg_exe()
probe=subprocess.run([exe,'-hide_banner','-i',str(video)],capture_output=True,text=True)
assert 'Audio: aac' in probe.stderr,'Missing audio'
decode=subprocess.run([exe,'-v','error','-i',str(video),'-f','null','-'],capture_output=True,text=True)
assert decode.returncode==0 and not decode.stderr.strip(),decode.stderr
result={'video':str(video),'metadata':metadata,'validatedBeats':len(review),'fullDecode':'passed','audio':'AAC','bytes':video.stat().st_size}
if polar:
    # Verify the user's spoken CTA in the actual mixed/exported MP4, not only its source WAV.
    clip=ROOT/'.cache'/slug/'rendered-cta.wav'
    extract=subprocess.run([exe,'-y','-hide_banner','-loglevel','error','-ss',str(max(0,cta['start']-.04)),'-i',str(video),'-t',str(cta['duration']+.12),'-vn','-ac','1','-ar','24000',str(clip)],capture_output=True,text=True)
    assert extract.returncode==0,extract.stderr
    from faster_whisper import WhisperModel
    from runpy import run_path
    normalize=run_path(str(Path(__file__).with_name('cafe-cold-audio.py')))['tokens']
    model=WhisperModel('small',device='cpu',compute_type='int8',cpu_threads=8,download_root=str(ROOT/'.cache/audio-first/whisper'),local_files_only=True)
    segments,_=model.transcribe(str(clip),language='fr',beam_size=5,temperature=0,vad_filter=False,condition_on_previous_text=False)
    observed=' '.join(s.text.strip() for s in segments)
    assert normalize(observed)==normalize(cta['text']),f'CTA du MP4 à contrôler : {observed}'
    result['renderedSpokenCTA']={'status':'passed','observed':observed}
(video.parent/'validation.json').write_text(json.dumps(result,indent=2),encoding='utf-8')
print(json.dumps(result,indent=2))
