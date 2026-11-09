import layouts from './pet-sprite-layouts.json'
import calmLayouts from './pet-calm-idle-layouts.json'
import renderLayouts from './pet-render-layouts.json'
import eatingLayouts from './pet-eating-layouts.json'
import type { PetSpeciesId } from './pet-catalog'
export function petDrawLayout(speciesId: PetSpeciesId, kind: 'idle' | 'hungry' | 'happy' | 'eat') {
  const sheet =
    kind === 'eat'
      ? eatingLayouts[`${speciesId}-eat` as keyof typeof eatingLayouts]
      : kind === 'idle'
        ? calmLayouts[`${speciesId}-idle` as keyof typeof calmLayouts]
        : layouts[`${speciesId}-${kind}` as keyof typeof layouts]
  const stage = renderLayouts[speciesId],
    scale = sheet.scale * stage.scale
  return {
    cell: sheet.cell,
    x: stage.anchor[0] - sheet.anchor[0] * scale,
    y: stage.anchor[1] - sheet.anchor[1] * scale,
    size: sheet.cell * scale,
    scale,
  }
}
