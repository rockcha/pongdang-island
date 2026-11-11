import fs from 'node:fs'
import { pets } from './prepare-pet-preview-assets.mjs'
export const batch = 'assets/storage-upload/new/20261110-154000'
export const layoutPath = 'src/features/pets/pet-needs-layouts.json'
export const minSourceMargin = 0.06
export const maxSourceOccupancy = 0.9
export const faces = {
  'sand-golem-needs': [225, 180, 245],
  'wave-cat-needs': [260, 190, 218],
  'mochi-dragon-needs': [220, 175, 245],
  'jelly-seal-needs': [200, 180, 230],
}
const actions = {
  'sand-golem': ['Both stone hands rest on belly, tiny worried mouth, sprout slightly drooped. Small hand slides inward over belly then back, no torso movement.', 'One small stone hand reaches forward slightly asking for company, gentle pleading eyes and small downturned mouth. Hand extends a little and returns, other hand rests.'],
  'wave-cat': ['Ears slightly lowered, quiet hungry face, paws near tummy. A tiny lip lick, mouth closes; tail rests still.', 'Soft pleading eyes, ears relaxed outward, small lonely mouth. One forepaw lifts only slightly toward viewer then returns, tail quiet.'],
  'mochi-dragon': ['One hand rests on belly, tiny hungry open mouth, wings folded quietly close to body. Hand rubs belly a little and mouth opens then closes softly.', 'Both hands held together close to chest, folded wings, wistful eyes. Hands draw a little closer together then relax, very small wing-tip settling.'],
  'jelly-seal': ['Flippers resting against belly, small hungry mouth, gentle worried eyes. One flipper softly strokes belly then rests.', 'Flippers held close together below chin, tender wistful eyes looking toward viewer. Flippers reach a little forward then return, not clapping.'],
}
export const sheets = pets.map(p => ({
  id: `${p.id}-needs`, pet_id: p.id, frames: 8, columns: 4, reference: `public/${p.thumbnail_path}`,
  sprite_sheet_path: `pets/${p.id}_needs8_v1_sprite.png`,
  prompt: `Use case: identity-preserve. Production game pet sprite sheet. EXACTLY FOUR columns by TWO rows, eight equal SQUARE cells, landscape canvas aspect 2:1. Input is approved identity/style reference. ${p.appearance} Same seated three-quarter-front orientation, full silhouette, exact same facial proportions, head size, colors, materials and thin warm outlines in every frame. TOP ROW frames 0,1,2,3 are HUNGRY: ${actions[p.id][0]} BOTTOM ROW frames 4,5,6,7 are LONELY/LOW AFFECTION: ${actions[p.id][1]} Each row is a quiet cycle: first pose is the sustained clear emotional resting pose, second pose starts a subtle gesture, third pose reaches the SMALL gesture peak, fourth pose recovers toward first. NOT sleepy eyes, no sleeping or crying, no joy, no large waving. Main head/forehead and feet positions MUST stay fixed across all eight cells; only pupils, eyelids, mouth and the specified little limb gesture move. No head nodding or rotation, no whole-body wobble, stretching, scale changes, jumping or per-cell recentering. Each complete pet fits central 60 percent of each cell, with at least 15 percent genuinely transparent margin on ALL sides including tail, sprout, horns and whiskers. Match the provided individual exactly. No text, grid lines, props, food, hearts, tears, particles, floor, shadows, white background or checkerboard. Actual clean alpha transparency. Soft polished illustration matching reference, no glow halos.`,
}))
if (process.argv[1]?.replaceAll('\\','/').endsWith('/prepare-pet-needs.mjs')) {
  for (const sub of ['sources','pets','review']) fs.mkdirSync(`${batch}/${sub}`,{recursive:true})
  fs.writeFileSync(`${batch}/manifest.json`,JSON.stringify({tool:'image_gen.imagegen',purpose:'Quiet hungry and lonely poses, operator preview only',status:'in-progress',items:sheets},null,2)+'\n')
  fs.writeFileSync(`${batch}/README.md`,'# Pet needs poses\n\nVersioned public pet art; operator preview only. Each sheet contains four hungry poses above four low-affection poses. Prompts and identity references are recorded in manifest.json. Original alpha and source bytes are preserved; inspect registration and light/dark review before adopting. No remote upload or DB change.\n')
}
