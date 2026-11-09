import fs from 'node:fs'
import { pets } from './prepare-pet-preview-assets.mjs'
export const batch = 'assets/storage-upload/new/20261109-190000'
export const layoutPath = 'src/features/pets/pet-calm-idle-layouts.json'
export const faces = {
  'sand-golem-idle': [248, 184, 235],
  'wave-cat-idle': [280, 202, 190],
  'mochi-dragon-idle': [202, 185, 210],
  'jelly-seal-idle': [191, 185, 210],
}
export const sheets = pets.map((p) => ({
  id: `${p.id}-idle`,
  pet_id: p.id,
  frames: 8,
  columns: 4,
  sprite_sheet_path: `pets/${p.id}_idle8_v2_sprite.png`,
  reference: `public/${p.thumbnail_path}`,
  prompt: `Use case: identity-preserve. Redraw the approved pet in reference image into ONE CALM IDLE GAME SPRITE SHEET: FOUR columns, TWO rows, EIGHT equally sized SQUARE cells, landscape canvas aspect 2:1. ${p.appearance} Exact same rendering, identity, seated pose and colors as reference. The pet is resting peacefully, not performing. All paws, feet, hands, wings, tail, sprout, ears and flippers rest in exactly the SAME position across all eight frames. LOCK face, nose, head size, feet, baseline and overall silhouette. NO waving, licking, clapping, yawning, bouncing, head tilting, wing spreading or changing mouth. NO full-body translation or zoom. Upper row frames0,1,2,3: eyes fully open in ALL FOUR; the ONLY motion is an extremely subtle 1 percent lower chest/belly breathing expansion, progressively neutral, tiny inhale, halfway inhale, full tiny inhale. Breathing should be almost imperceptible, never big squashing or changing head size. Lower row frame4: original neutral eyes fully open, frame5: neutral body same but eyes HALF CLOSED, frame6: neutral body same but BOTH eyes fully CLOSED in a gentle blink, frame7: neutral body same but eyes HALF OPEN recovering. Lower row all limbs, head and chest identical to frame0, change ONLY eyelids. Eyes closed are simple relaxed lids, no huge smile. Tiny micro breathing plus a restrained blink, suitable for quiet slow 6-second breathing and occasional blinking, NOT a cartoon action loop. Entire complete pet must occupy central 60% of EACH cell with at least 15% true transparent margin on EVERY side. Keep all eight faces and feet at identical x/y cell coordinates. Clean thin warm colored outlines and soft refined cartoon shading. Actual transparent background, no shadow, no floor, no checkerboard, no grid, no text, no effects, no detached particles or halo.`,
}))
if (process.argv[1]?.replaceAll('\\', '/').endsWith('/prepare-pet-calm-idle.mjs')) {
  fs.mkdirSync(`${batch}/sources`, { recursive: true })
  fs.mkdirSync(`${batch}/pets`, { recursive: true })
  fs.mkdirSync(`${batch}/review`, { recursive: true })
  fs.writeFileSync(
    `${batch}/manifest.json`,
    JSON.stringify(
      {
        tool: 'image_gen.imagegen',
        status: 'in-progress',
        purpose: 'Quiet seated idle; slow breathing and occasional blink only',
        items: sheets,
      },
      null,
      2,
    ) + '\n',
  )
}
