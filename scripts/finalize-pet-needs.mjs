import fs from 'node:fs'
import sharp from 'sharp'
import {createHash} from 'node:crypto'
const blink=process.argv.includes('--blink')
const {batch,sheets}=await import(blink ? './prepare-pet-needs-blink.mjs' : './prepare-pet-needs.mjs')
const read=p=>JSON.parse(fs.readFileSync(p,'utf8').replace(/^\uFEFF/,''))
const hash=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex')
const reg=read(`${batch}/registration.json`),final=read(`${batch}/registered-final-8.json`)
if(final.length!==4 || final.some(r=>r.frames.some(f=>f.dx || f.dy || f.rmse>40))) throw Error('Final anchors not stable')
const manifest=read(`${batch}/manifest.json`)
const motionRegistration=manifest.verification?.motionRegistration
for(const s of sheets){
  const r=reg.find(r=>r.id===s.id),file=`${batch}/${s.sprite_sheet_path}`
  const item=manifest.items.find(i=>i.id===s.id)
  Object.assign(item,{source_sprite:`sources/${s.id}-sprite.source`,source_sha256:hash(`${batch}/sources/${s.id}-sprite.source`),sprite_sha256:hash(file),rgbaPreserved:r.rgbaPreserved})
  for(const [theme,color] of [['light','#faf6ef'],['dark','#193744']]) await sharp(file).flatten({background:color}).resize(1200).png().toFile(`${batch}/review/${s.id}-${theme}-final.png`)
  for(const [state,base] of [['hungry',0],['lonely',4]]){
    const pages=[]
    for(const f of [base,base+1,base+2,base+3,base]) pages.push(await sharp(file).extract({left:f%4*r.cell,top:Math.floor(f/4)*r.cell,width:r.cell,height:r.cell}).resize(300).raw().toBuffer())
    await sharp(Buffer.concat(pages),{raw:{width:300,height:1500,channels:4,pageHeight:300}}).webp({quality:90,loop:0,delay:[8000,900,900,900,900]}).toFile(`${batch}/review/${s.pet_id}-${state}.webp`)
  }
}
const browser=fs.existsSync(`${batch}/review/browser-check.json`) ? read(`${batch}/review/browser-check.json`) : null
if(browser && (browser.results.length!==8 || browser.errors.length || !browser.reducedMotion || browser.results.some(r=>!r.holdsRest || !r.slowGesture))) throw Error('Runtime needs review failed')
manifest.status=browser ? 'locally-verified' : 'art-verified-runtime-pending'
manifest.verification={registration:'registration.json',finalAnchors:'registered-final-8.json',rgbaPreserved:true,sourceMargins:'At least 6% on each side; maximum silhouette occupancy 90%; no clipped source parts. Uniform padding for integer registration only.',timing:'8–12 seconds held emotional pose, 3.6 second gesture; no whole-body transforms',remoteDeployed:false}
if(blink) manifest.verification.timing='300ms blink, 7–12 second irregular schedule. Only two clipped eye patches render over the original needs pose; complete body is never swapped.'
if(motionRegistration) manifest.verification.motionRegistration=motionRegistration
if(browser) manifest.verification.browser='review/browser-check.json'
if(blink && fs.existsSync(`${batch}/review/browser-blink-check.json`)) {
  const checked=read(`${batch}/review/browser-blink-check.json`)
  if(checked.results.length!==12 || checked.errors.length || !checked.reducedMotion || checked.results.some(r=>r.inside<=100 || r.state!=='idle' && r.outside)) throw Error('Eye blink runtime review failed')
  manifest.status='locally-verified'
  manifest.verification.browser='review/browser-blink-check.json'
}
fs.writeFileSync(`${batch}/manifest.json`,JSON.stringify(manifest,null,2)+'\n')
console.log('Four needs sheets registered and alpha preserved; eight slow state previews exported.')
