import layouts from './pet-sprite-layouts.json'
import calmLayouts from './pet-calm-idle-layouts.json'
import renderLayouts from './pet-render-layouts.json'
import eatingLayouts from './pet-eating-layouts.json'
import needsLayouts from './pet-needs-layouts.json'
import blinkLayouts from './pet-needs-blink-layouts.json'
import motionRegistration from './pet-motion-registration.json'
import type { PetSpeciesId } from './pet-catalog'
export function petDrawLayout(speciesId: PetSpeciesId, kind: 'idle' | 'hungry' | 'happy' | 'eat' | 'needs' | 'needsBlink') {
  const sheet =
    kind === 'needsBlink'
      ? blinkLayouts[`${speciesId}-needs-blink` as keyof typeof blinkLayouts]
      : kind === 'needs'
      ? needsLayouts[`${speciesId}-needs` as keyof typeof needsLayouts]
      : kind === 'eat'
      ? eatingLayouts[`${speciesId}-eat` as keyof typeof eatingLayouts]
      : kind === 'idle'
        ? calmLayouts[`${speciesId}-idle` as keyof typeof calmLayouts]
        : layouts[`${speciesId}-${kind}` as keyof typeof layouts]
  const registered = kind === 'hungry' ? sheet : motionRegistration[speciesId][kind]
  const stage = renderLayouts[speciesId],
    scale = registered.scale * stage.scale
  return {
    cell: sheet.cell,
    x: stage.anchor[0] - registered.anchor[0] * scale,
    y: stage.anchor[1] - registered.anchor[1] * scale,
    size: sheet.cell * scale,
    scale,
  }
}
export const petBlinkEyes = (speciesId: PetSpeciesId) => blinkLayouts[`${speciesId}-needs-blink` as keyof typeof blinkLayouts].eyes
