"""Package the completed local release, including source and rendered media."""
from pathlib import Path
import hashlib
import json
import textwrap
import zipfile
from PIL import Image, ImageDraw, ImageFont

root=Path(__file__).resolve().parents[2]
output=root/'out/2.01'
catalog=json.loads((root/'src/releases/v2-01/catalog.json').read_text(encoding='utf-8'))
status=json.loads((output/'status.json').read_text(encoding='utf-8'))
assert status['completed']==len(catalog['videos']), 'Le lot doit être entièrement validé avant empaquetage'
font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',14)
small=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',12)
sheet=Image.new('RGB',(216*5,440*4),'#17202a')
for i,video in enumerate(catalog['videos']):
    record=status['videos'][video['slug']]
    assert record['rendered'] and record['signature'].startswith(status['sourceFingerprint']+':')
    movie=output/video['slug']/f"{video['slug']}-2.01.mp4"
    assert hashlib.sha256(movie.read_bytes()).hexdigest()==record['mp4Hash']
    poster=Image.open(output/video['slug']/'poster.png').convert('RGB').resize((216,384),Image.Resampling.LANCZOS)
    x=(i%5)*216; y=(i//5)*440
    sheet.paste(poster,(x,y))
    draw=ImageDraw.Draw(sheet)
    draw.text((x+8,y+391),f'{i+1:02d} · 2.01 · {video["duration"]:.1f} s',font=small,fill='#f2d16d')
    for line,text in enumerate(textwrap.wrap(video['title'],29)[:2]): draw.text((x+8,y+407+line*16),text,font=font,fill='#eee9dc')
sheet.save(output/'apercu-2.01.png')

snapshot=output/'sources-2.01.zip'
files=[]
for folder in ['src','scripts','docs','tests','.claude/skills']:
    files += [p for p in (root/folder).rglob('*') if p.is_file() and '__pycache__' not in p.parts]
for filename in ['package.json','package-lock.json','README.md','remotion.config.ts','tsconfig.json','.gitignore']:
    files.append(root/filename)
files += [p for p in (root/'public').rglob('*') if p.is_file() and (p.suffix.lower() in ['.png','.jpg','.jpeg','.svg','.geojson','.woff','.woff2','.ttf'] or p.name.upper()=='SOURCE.JSON')]
with zipfile.ZipFile(snapshot,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=6) as archive:
    for file in sorted(set(files)): archive.write(file,file.relative_to(root).as_posix())
with zipfile.ZipFile(snapshot) as archive: assert archive.testzip() is None

package=output/'whatif-2.01-complet.zip'
with zipfile.ZipFile(package,'w',compression=zipfile.ZIP_STORED) as archive:
    for file in sorted(output.rglob('*')):
        if not file.is_file() or file==package or 'source-before' in file.relative_to(output).parts: continue
        archive.write(file,file.relative_to(output).as_posix())
with zipfile.ZipFile(package) as archive: assert archive.testzip() is None
print(json.dumps({'version':'2.01','videos':status['completed'],'package':str(package),'bytes':package.stat().st_size,'sourceFiles':len(files)}))
