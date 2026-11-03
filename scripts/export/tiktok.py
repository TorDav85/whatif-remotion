from pathlib import Path
import json
root=Path(__file__).resolve().parents[2]
p=json.loads((root/"src/videos/paris-tiktok/scenario.json").read_text(encoding="utf-8"))
# Generate plain-text publication assets from the same scenario source.
out=root/'out';out.mkdir(exist_ok=True)
def timestamp(t):
    ms=round(t*1000);return f'{ms//3600000:02}:{ms//60000%60:02}:{ms//1000%60:02},{ms%1000:03}'
subtitle=[]
script=['# Et si un trou noir apparaissait à Paris ? — 70 secondes\n',
        'Accroche : « Cette voiture a 6 secondes. »\n',
        'Format : 1080 × 1920, voix française, 30 images/s.\n',
        'Scénario fictif. Temps, tailles et absorption amplifiés pour la mise en scène.\n']
for i,b in enumerate(p['beats']):
    words=b.get('caption',b.get('title','')).replace('{','').replace('}','')
    subtitle.append(f'{i+1}\n{timestamp(b["t"])} --> {timestamp(b["end"])}\n{words}\n')
    script.append(f'**{b["t"]:g}–{b["end"]:g} s** — Écran : {words}\n\nVoix : {b["voice"] or "Retour visuel au premier plan, sans voix."}\n')
script.append('Source du retournement scientifique : [NASA — Black Holes](https://science.nasa.gov/universe/black-holes/).\n')
(out/'whatif-paris-tiktok-70s.srt').write_text('\n'.join(subtitle),encoding='utf-8')
(out/'whatif-paris-tiktok-70s-scenario.md').write_text('\n'.join(script),encoding='utf-8')
(out/'whatif-paris-tiktok-70s-publication.txt').write_text('Et si un trou noir apparaissait à Paris ? Regarde la voiture rouge… Tu l’avais vue venir ?\n\n#whatif #trounoir #paris #espace #sciencefiction\n',encoding='utf-8')
print('Scénario TikTok : 70 secondes, 20 beats, sous-titres et texte de publication générés.')
