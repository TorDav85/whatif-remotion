import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {bundle} from '@remotion/bundler';
import {openBrowser, selectComposition, renderStill, renderMedia} from '@remotion/renderer';

const root=process.cwd();
const v2=process.argv.includes('--v2');
const bus=process.argv.includes('--bus');
const dense=process.argv.includes('--dense');
const polarV2=process.argv.includes('--polar-v2')||dense;
const polar=process.argv.includes('--polar')||polarV2;
const slug=polarV2?'paris-polar-v2':polar?'paris-polar':bus?'bus-cold':v2?'cafe-cold-v2':'cafe-cold';
const id=polarV2?'ParisPolarV2':polar?'ParisPolar':bus?'BusCold':v2?'CafeColdV2':'CafeCold';
const preview=process.argv.includes('--preview');
const timeline=JSON.parse(fs.readFileSync(`src/videos/${slug}/timing.json`,'utf8'));
if(timeline.provisional&&!preview) throw new Error('Finaliser les prises vocales avant le rendu.');
if((v2||bus||polar)&&timeline.voice!=='morpheus') throw new Error('Le profil morpheus est requis.');
const folder=path.join(root,`out/${dense?'paris-polar-v3':slug}`);
fs.mkdirSync(folder,{recursive:true});
if((v2||bus||polar)&&!preview){
  const review=JSON.parse(fs.readFileSync(path.join(root,`out/${slug}/audio-review.json`),'utf8'));
  for(const beat of timeline.beats){
    const checked=review.find(b=>b.id===beat.id);
    const hash=createHash('sha256').update(fs.readFileSync(path.join(root,'public',beat.audio))).digest('hex');
    if(!checked?.match||checked.audioSha256!==hash||beat.sha256!==hash) throw new Error(`Prise vocale à vérifier : ${beat.id}`);
  }
}
const serveUrl=await bundle({entryPoint:path.join(root,'src/index.ts'),outDir:path.join(root,`.cache/${slug}/bundle`)});
const chromiumOptions={gl:'angle'};
const browser=await openBrowser('chrome',{chromiumOptions});
try {
  const composition=await selectComposition({serveUrl,id,puppeteerInstance:browser,chromiumOptions});
  {
    const shots=polar?[['avant','hook',1],['photo','normal',1],['panier','basket',1],['neige','snow',2],['velo','bike',2],['circulation','traffic',1.5],['metro','rescue',2],['apres','return',1],['panier-final','basketend',1],['cta','cta',1.5]]:bus?[['avant','normal',1],['arrivee','arrival',1],['porte','door',1.3],['canne','grip',1],['choix','choice',2],['entraide','help',2],['conducteur','driver',.6],['exterieur','outside',1.5],['interieur','inside',2],['apres','shared',2]]:[['avant','sunny',1],['veste','coffee',0.5],['clients','guests',1.5],['givre','frost',2.3],['interieur','inside',1.5],['apres','chair',2]];
    const selectedShots=polarV2?[['avant','hook',1],['marc','normal',1],['cta','cta',1.5],['froid','chill',2],['neige','snow',2],['glissade','slip',1.5],['circulation','traffic',1.5],['metro','escape',1.5],['apres','return',1],['final','tower',1]]:shots;
    const finalShots=dense?[...selectedShots,['champ-de-mars','intro',.6],['champ-de-mars-polaire','deep',1],['fontaines-gelees','silence',2]]:selectedShots;
    for(const [name,id,offset] of finalShots){
      const t=timeline.beats.find(b=>b.id===id).start+offset;
      await renderStill({serveUrl,composition,puppeteerInstance:browser,chromiumOptions,frame:Math.round(t*timeline.fps),scale:0.65,imageFormat:'png',output:path.join(folder,`${name}.png`)});
      console.log(`Aperçu ${name} : ${t.toFixed(2)}s`);
    }
  }
  if(!preview){
    let previous=-1;
    const filename=dense?'paris-catastrophe-polaire-v3-paris-dense.mp4':polarV2?'paris-catastrophe-polaire-v2-marc.mp4':polar?'paris-catastrophe-polaire-morpheus.mp4':bus?'le-prochain-bus-morpheus.mp4':v2?'la-place-au-soleil-v2-morpheus.mp4':'la-place-au-soleil.mp4';
    await renderMedia({serveUrl,composition,puppeteerInstance:browser,chromiumOptions,codec:'h264',pixelFormat:'yuv420p',crf:18,imageFormat:'jpeg',jpegQuality:95,concurrency:2,overwrite:true,outputLocation:path.join(folder,filename),
      onProgress:({progress,renderedFrames,encodedFrames})=>{const step=Math.floor(progress*100/5)*5;if(step!==previous){previous=step;console.log(`${step}% · images ${renderedFrames}/${composition.durationInFrames} · encodées ${encodedFrames}`);}}
    });
    console.log(`VIDÉO : ${path.join(folder,filename)}`);
  }
}finally{await browser.close({silent:true});}
