import fs from 'node:fs'
import path from 'node:path'
const root=path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/,'$1'))
const batch=decodeURIComponent(root)
const file=path.join(batch,'manifest.json'),manifest=JSON.parse(fs.readFileSync(file,'utf8'))
const common='assets/references/collectible-style/common-rare-pongi.png'
const fantasy='assets/references/collectible-style/epic-mythic-starlight.png'
for(const item of manifest.items){
 const folder=item.kind==='fish'?'fish':item.kind==='trash'?'trash':'decorations'
 const grade=item.rarity==='common'?'normal':item.rarity
 item.frames=item.kind==='fish'?(item.rarity==='mythic'?8:4):1
 item.thumbnail_path=`${folder}/${grade}/${item.id}_v1_thumbnail.png`
 item.sprite_sheet_path=item.frames>1?`${folder}/${grade}/${item.id}_v1_sprite.png`:null
 item.travel_direction=item.movement_type==='fixed'?'right':'both'
 item.flip_with_direction=item.kind==='fish'
 item.facing_direction=item.kind==='fish'?'right':null
 const soft=['epic','mythic'].includes(item.rarity)
 item.references=[soft?fantasy:common,item.region==='coral'?
  (soft?'assets/storage-upload/new/20261015-133650/fish/epic/coral-crowned-turtle_thumbnail.png':'assets/storage-upload/new/20261015-192806/fish/rare/coral-hat-octopus_thumbnail.png'):
  (soft?'assets/storage-upload/new/20261015-213344/fish/epic/atlantean-guard-shark_thumbnail.png':'assets/storage-upload/new/20261015-213344/fish/normal/teacup-nest-blenny_thumbnail.png')]
 item.reference_roles=['grade-specific painting style only; not subject or silhouette','regional palette and materials only; not subject or silhouette']
 item.thumbnail_prompt=`Use case: stylized-concept. Asset: ONE individual production collectible game thumbnail, ${item.name}, ${item.rarity} ${item.kind}, ${item.region==='coral'?'warm pastel coral reef':'ancient sunken Atlantean kingdom'}. Subject: ${item.concept} Style references are ONLY for painting and palette, never copy their animal, anatomy, pose or accessories. ${soft?'Soft sophisticated fantasy illustration, delicate colored contours, rich smooth gradients, dimensional gentle shading, subtle translucency and material detail. Do not reuse the ray silhouette or upswept wings; no thick cartoon outlines.':'Warm polished cartoon illustration, thin clean warm-brown colored contours, soft dimensional cel shading, friendly but NATURAL small eyes, restrained highlights, believable anatomy. No oversized sparkling eyes, chubby inflated proportions or plastic toy gloss.'} ${item.kind==='fish'?'Face SCREEN RIGHT in clear side or side-three-quarter profile. Head, mouth and snout point RIGHT, body and tail trail LEFT. Show forward movement to RIGHT, never front-facing, backward or mirrored.':'Three-quarter view showing the complete coherent object, never a scene or a collection of variants. Objects have no added face.'} One complete isolated subject centered, comfortably occupies 75-80% of square image with at least 10% empty margin ALL SIDES; show all fins, tail, arms and protrusions. Genuine alpha-transparent background. No water background, floor, cast shadow, landscape, text, labels, logo, frame, checkerboard, fog or detached particles. Clean antialiased silhouette, no white/black matte fringes or stray pixels, preserve thin translucent structures; all light stays close to the subject.`
 item.review_status??='pending'
}
fs.writeFileSync(file,JSON.stringify(manifest,null,2)+'\n')
console.log(`Prepared ${manifest.items.length} individual asset specifications`)
