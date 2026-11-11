import fs from 'node:fs'
import {pets} from './prepare-pet-preview-assets.mjs'
export const batch='assets/storage-upload/new/20261110-160000'
export const layoutPath='src/features/pets/pet-needs-blink-layouts.json'
export const minSourceMargin=0.06
export const maxSourceOccupancy=0.9
export const eyes={
  'sand-golem-needs-blink':[[185,158,48,54],[273,145,40,51]],
  'wave-cat-needs-blink':[[206,169,57,51],[292,150,48,56]],
  'mochi-dragon-needs-blink':[[131,133,53,48],[224,150,49,48]],
  'jelly-seal-needs-blink':[[130,155,45,35],[218,172,44,39]],
}
export const faces={
  'sand-golem-needs-blink':[225,180,245],
  'wave-cat-needs-blink':[260,190,218],
  'mochi-dragon-needs-blink':[220,175,245],
  'jelly-seal-needs-blink':[200,180,230],
}
export const sheets=pets.map(p=>({
  id:`${p.id}-needs-blink`,pet_id:p.id,frames:8,columns:4,
  reference:`public/pets/${p.id}_needs8_v1_sprite.png`,
  sprite_sheet_path:`pets/${p.id}_needs_blink8_v1_sprite.png`,
  prompt:`Use case: identity-preserve precise animation edit. Input is the approved 4 by 2 pet sprite sheet. Create a companion EYE BLINK sheet, EXACTLY 4 columns and 2 rows of equal SQUARE cells on a 2:1 landscape canvas, actual transparent alpha background. Preserve this exact character, colors, rendering, thin outlines and face/body scale and position. TOP ROW: use the input TOP LEFT hungry resting pose in ALL FOUR cells. BOTTOM ROW: use the input BOTTOM LEFT lonely resting pose in ALL FOUR cells. Keep each row's face expression, mouth, eyebrow mood and hands as in that resting pose. The ONLY changed part between cells is the eyelids: column 0 eyes fully open exactly as input; column 1 eyes half closed, upper eyelid lowering; column 2 BOTH eyes fully closed, simple delicate curved closed-eye lines, no visible eyeballs, no smile, no sleepy facial change; column 3 eyes half opening. Complete BOTH eyes in every frame, preserve their asymmetric three-quarter perspective. No body/limb/ear/tail/sprout movement AT ALL. No head tilting or bobbing or rotation. No changing anatomy, face position or head size. Do NOT reproduce the arm gestures from the other input columns, just the first resting pose per row. Put each whole pet in central 60% of each cell with at least 15% transparent margin at every side. Entire outline intact, same orientation. No text, grid, white background, checkerboard, floor, shadows, halo or particles. High quality identical warm illustration. ${p.appearance}`,
}))
if(process.argv[1]?.replaceAll('\\','/').endsWith('/prepare-pet-needs-blink.mjs')){
  for(const sub of ['sources','pets','review'])fs.mkdirSync(`${batch}/${sub}`,{recursive:true})
  fs.writeFileSync(`${batch}/manifest.json`,JSON.stringify({tool:'image_gen.imagegen',purpose:'Blink-only companion frames for hungry and lonely resting poses',status:'in-progress',items:sheets},null,2)+'\n')
  fs.writeFileSync(`${batch}/README.md`,'# Needs eye blinks\n\nCompanion alpha sheets for operator preview. Each row reuses its emotional resting pose and changes only eyelids, open/half/closed/half. Generated source, prompts, integer registration and light/dark review are preserved here. No server changes or remote upload.\n')
}
