import fs from 'node:fs'
import {createHash} from 'node:crypto'
import {batch} from './prepare-weather-spirit-assets.mjs'
const read=file=>JSON.parse(fs.readFileSync(file,'utf8').replace(/^\uFEFF/,''))
const hash=file=>createHash('sha256').update(fs.readFileSync(file)).digest('hex')
const manifest=read(`${batch}/manifest.json`),registration=read(`${batch}/registration.json`)
const finalAnchors=read(`${batch}/registered-final-8.json`)
if(finalAnchors.some(r=>r.frames.some(f=>f.dx!==0||f.dy!==0||f.rmse>30)))throw Error('Final anchor check failed')
const browser=read(`${batch}/review/browser-check.json`)
if(browser.uniqueFrames.some(n=>n!==8)||!browser.reducedMotionStable||browser.errors.length)throw Error('Browser review incomplete')
for(const i of manifest.items){
 i.source_thumbnail=`sources/${i.id}-thumbnail.source`
 i.source_sprite=`sources/${i.id}-sprite.source`
 i.facing_direction='right'
 i.references={style:manifest.style_reference,identity:i.thumbnail_path,placement:`sources/${i.id}-placement-guide.png`}
 i.raw_sha256=hash(`${batch}/${i.source_sprite}`)
 i.sprite_sha256=hash(`${batch}/${i.sprite_sheet_path}`)
 i.thumbnail_sha256=hash(`${batch}/${i.thumbnail_path}`)
 i.original_review='All eight complete right-facing poses; original alpha>=32 margins >=8%; no cut-off anatomy. Low-alpha pixels inspected on light and dark composites.'
 i.final_review='Inverse integer face-anchor translation baked into PNG with uniform padding. Original RGBA preserved. Final anchor residual zero; production CollectiblePreview shows all eight frames; reduced motion holds frame zero.'
 if(i.id.endsWith('seollu'))i.refinement_prompt="Edit target IMAGE 2 is an eight-pose fairy sprite sheet. Image 1 is identity reference; Image 3 is placement reference. Fix image 2: completely REMOVE the big cloudy glowing aura and surrounding haze from ALL EIGHT cells. Preserve the actual featherless translucent wings as anatomy but no light outside their clean borders. Enforce a 4-column 2-row sheet of equal SQUARE cells at 2:1 canvas ratio. Uniformly make all eight characters smaller so ALL visible artwork including hands and wings sits within central 62% of EACH cell, leaving 15% clear transparent margin on every side, no cropped hand. Preserve same pretty youthful face, exact clothes, right-facing orientation and same scale/anchored face in all frames. Row 1 four gentle different wing/cloth motion poses, no snowflake yet. Row 2 hand prepares, snowflake opens directly over palm, folds away, returns to neutral. No other particles, no fog, no checkerboard, no frame labels or lines. Clean antialiased true alpha edges, no glow fringe, transparent background."
 if(i.id.endsWith('saha'))i.refinement_prompt="Edit IMAGE 2: keep this pretty youthful sand fairy and its EIGHT animated poses, but UNIFORMLY SHRINK all eight complete figures to 70% of their current size about each cell center, exact same scale for all. Four columns, two rows, equal square cells, total sheet 2:1. Keep everything including ponytail, shoes, wings and sand clock inside central 60% of EVERY cell, at least 15% completely empty transparent margins on all sides. Remove ALL the red/gold background haze and floating sand dust OUTSIDE the actual wing shapes, hair and costume. No outer glow. The only magic is tiny crescent directly beside the hourglass within figure silhouette in LOWER ROW. Top row four connected gentle wing/hair/cloth motion poses with neutral hourglass; bottom row hand prepares, tiny sand crescent appears by clock, returns into clock, neutral recovery. Same head and torso position and size within each cell, face right in every pose. Image1 identity, image3 placement only. Actual alpha background, clean cutout edges, NO mist, no halo, no checkerboard, no text, no grid. Preserve whole figure, do not crop."
 if(i.id.endsWith('luon')||i.id.endsWith('hwarin')){
  const meteor=i.id.endsWith('luon')
  i.refinement_prompt=`Edit target IMAGE 2, keep this exact youthful ${meteor?'meteor fairy':'flower fairy'} character and EIGHT animated poses, but uniformly SHRINK ALL complete figures to 65% of their current size, the same constant scale in every cell. Keep exact FOUR equal SQUARE columns by TWO rows, entire canvas 2:1 landscape. Put each head/torso in the same anchored position within its own cell. Entire visible figure including wings, feet, hair, costume and magical prop within central 60% of EACH cell, minimum 15% genuinely transparent empty space on ALL FOUR sides of all eight cells. Absolutely remove ALL outer glowing fog, haze, pink/blue/red background artifacts and dust; retain only the actual fairy and translucent anatomical wings with clean borders. Image1 identity, Image3 placement only. Top row four gentle connected wing and hair and clothing movement poses, neutral held ${meteor?'meteor':'flowerbud'}. Bottom row preparation, ${meteor?'small meteor traces a tiny close arc':'held flower opens'}, recover, neutral. Preserve right-facing pretty face and innocent full clothing in every frame. No crop, no halo, no particles, no grid, no text, no background, no checkerboard. True alpha transparency and clean finished antialiased edges.`
 }
}
manifest.status='locally-verified-not-deployed'
manifest.verification={originalAudit:'audit.json',finalAudit:'final-audit.json',registration:'registration.json',finalAnchors:'registered-final-8.json',browser:'review/browser-check.json',remoteApplied:false,storageUploaded:false}
manifest.entries=manifest.items.map(i=>({id:i.id,frames:8,columns:4,storage_path:i.sprite_sheet_path,source:i.source_sprite,prompt:i.refinement_prompt??i.sprite_prompt}))
fs.writeFileSync(`${batch}/manifest.json`,JSON.stringify(manifest,null,2)+'\n')
for(const r of registration)r.rawAudit={bounds:r.rawBounds}
fs.writeFileSync(`${batch}/registration.json`,JSON.stringify(registration,null,2)+'\n')
const sourcesFile='assets/references/mythic-sprites/sources.json',sources=read(sourcesFile)
if(!sources.manifests.includes(`${batch}/manifest.json`))sources.manifests.push(`${batch}/manifest.json`)
fs.writeFileSync(sourcesFile,JSON.stringify(sources,null,2)+'\n')
console.log('Finalized five locally verified fairies; no remote writes or release timestamps.')
