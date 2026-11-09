import fs from 'node:fs'
import {createHash} from 'node:crypto'
import sharp from 'sharp'
import {batch,items} from './prepare-weather-decoration-assets.mjs'
import {weatherDecorationFrame} from '../src/features/aquarium/weather-decoration-animation.ts'
const read=file=>JSON.parse(fs.readFileSync(file,'utf8').replace(/^\uFEFF/,''))
const hash=file=>createHash('sha256').update(fs.readFileSync(file)).digest('hex')
const manifest=read(`${batch}/manifest.json`),anchors=read(`${batch}/registered-final-4.json`)
const browser=read(`${batch}/review/browser-check.json`)
if(anchors.length!==5||anchors.some(r=>r.frames.some(f=>f.dx||f.dy||f.rmse>20)))throw Error('Final rigid anchor verification failed')
if(browser.uniqueFrames.some(n=>n!==4)||!browser.reducedMotionStable||!browser.tankReady||browser.errors.length)throw Error('Incomplete browser review')
for(const i of manifest.items){
 i.source_thumbnail=`sources/${i.id}-thumbnail.source`
 i.source_sprite=`sources/${i.id}-sprite.source`
 i.references={style:manifest.style_reference,identity:i.thumbnail_path,placement:`sources/${i.id}-placement-guide.png`}
 i.source_sha256=hash(`${batch}/${i.source_sprite}`)
 i.sprite_sha256=hash(`${batch}/${i.sprite_sheet_path}`)
 i.thumbnail_sha256=hash(`${batch}/${i.thumbnail_path}`)
 i.verification='Original complete silhouette with clear transparent margins; opaque plinth/frame anchor visually reviewed; inverse integer translation baked into final PNG, RGBA preserved, final residual zero. Four distinct poses verified in production preview and actual Phaser aquarium.'
}
manifest.status='locally-verified-not-deployed'
manifest.verification={sourceAudit:'audit.json',finalAudit:'final-audit.json',registration:'registration.json',finalAnchors:'registered-final-4.json',browser:'review/browser-check.json',remoteApplied:false,storageUploaded:false}
fs.writeFileSync(`${batch}/manifest.json`,JSON.stringify(manifest,null,2)+'\n')
// Portable animated reviews reuse the runtime frame schedule. They are review
// exports only; the app consumes the lossless PNG sheets, not these WebP files.
for(const i of items){
 const file=`${batch}/${i.sprite_sheet_path}`,metadata=await sharp(file).metadata(),cell=metadata.width/2
 const pages=[]
 for(let tick=0;tick<12;tick++){
  const frame=weatherDecorationFrame(i.id,tick/3)
  pages.push(await sharp(file).extract({left:frame%2*cell,top:Math.floor(frame/2)*cell,width:cell,height:cell}).resize(320,320).ensureAlpha().raw().toBuffer())
 }
 await sharp(Buffer.concat(pages),{raw:{width:320,height:320*pages.length,channels:4,pageHeight:320}}).webp({quality:90,loop:0,delay:Array(12).fill(333)}).toFile(`${batch}/review/${i.id}.webp`)
}
fs.writeFileSync(`${batch}/review/animated-preview.html`,`<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>날씨 장식물 애니메이션</title><style>body{background:#163e4c;color:#fff;font-family:sans-serif;margin:24px}main{display:flex;flex-wrap:wrap;gap:16px}figure{margin:0;text-align:center;background:#214b58;border-radius:16px;padding:8px}img{width:240px;height:240px}figcaption{padding:8px}</style><h1>날씨 장식물</h1><p>각 1,200골드 · 4프레임 제자리 애니메이션</p><main>${items.map(i=>`<figure><img src="${i.id}.webp" alt="${i.name}"><figcaption>${i.name}</figcaption></figure>`).join('')}</main></html>`)
console.log('Finalized five animated decorations and portable WebP previews; no remote writes.')
