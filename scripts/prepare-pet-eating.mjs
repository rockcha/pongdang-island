import fs from 'node:fs'
import { pets } from './prepare-pet-preview-assets.mjs'
export const batch = 'assets/storage-upload/new/20261109-203000'
export const layoutPath = 'src/features/pets/pet-eating-layouts.json'
export const faces = {
  'sand-golem-eat': [251, 197, 215],
  'wave-cat-eat': [279, 205, 190],
  'mochi-dragon-eat': [199, 190, 190],
  'jelly-seal-eat': [190, 176, 230],
}
export const sheets = pets.map((p) => ({
  id: `${p.id}-eat`,
  pet_id: p.id,
  frames: 8,
  columns: 4,
  reference: `public/${p.thumbnail_path}`,
  sprite_sheet_path: `pets/${p.id}_eat8_v1_sprite.png`,
  prompt: `Use case: identity-preserve. Make ONE beautiful game companion EATING animation sprite sheet, FOUR columns and TWO rows, EIGHT equal SQUARE cells on a 2:1 LANDSCAPE canvas. Input image is the approved identity and art style. ${p.appearance} Preserve its exact front three-quarter seated orientation, anatomy, colors, body proportions and warm thin cartoon outlines. Eight consecutive poses for a gentle 3-second feeding reaction: frame0 neutral notices food; frame1 mouth opens a LITTLE anticipating a bite; frame2 mouth gently closes and cheeks puff subtly chewing; frame3 tiny mouth opens again; frame4 closes and chews softly; frame5 eyes gently close contentedly with a SMALL chewing smile; frame6 tiny tongue licks lips (for golem a small content mouth motion instead of tongue); frame7 returns to original neutral with eyes open. Head, forehead and nose position FIXED in all eight frames, head size identical; jaw and cheeks move by only 1-2 percent, no whole-head bouncing, no growing or shrinking. Hands/paws/flippers rest quietly close to belly in ALL frames; no waving, clapping, large wing spreading or lifting arms. Mouth and cheeks must visibly change across frames, not only eyes. No bowl, food, props or effects inside the sheet (added by game UI). ENTIRE complete pet including ears/sprout, tail, feet/wings/flippers fits central 60% of EVERY cell with at least 15% TRUE transparent margin on all sides. Preserve full clean antialiased edges, actual alpha transparency, no white background, no floor/shadow, no checkerboard, no labels, no halo, no stray particles. Refined cute warm cartoon illustration, exactly same individual as input.`,
}))
if (process.argv[1]?.replaceAll('\\', '/').endsWith('/prepare-pet-eating.mjs')) {
  for (const sub of ['sources', 'pets', 'review'])
    fs.mkdirSync(`${batch}/${sub}`, { recursive: true })
  fs.writeFileSync(
    `${batch}/manifest.json`,
    JSON.stringify(
      {
        tool: 'image_gen.imagegen',
        status: 'in-progress',
        purpose: 'Dedicated 3-second feeding poses; fixed seated head anchor',
        items: sheets,
      },
      null,
      2,
    ) + '\n',
  )
}
