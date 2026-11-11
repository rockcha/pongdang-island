import layouts from './pet-sprite-layouts.json'
import calmLayouts from './pet-calm-idle-layouts.json'
import renderLayouts from './pet-render-layouts.json'
import eatingLayouts from './pet-eating-layouts.json'
import needsLayouts from './pet-needs-layouts.json'
import blinkLayouts from './pet-needs-blink-layouts.json'
import motionRegistration from './pet-motion-registration.json'
import groundOffsets from './pet-ground-offsets.json'
import horizontalOffsets from './pet-horizontal-offsets.json'
import { petUsesAtlas, type PetSpeciesId } from './pet-catalog'
export const petStageLayout = (speciesId: PetSpeciesId) => petUsesAtlas(speciesId)
  ? {scale: 1, anchor: [320, 250], bounds: [-280, -250, 280, 310]}
  : renderLayouts[speciesId as keyof typeof renderLayouts]
export function petDrawLayout(speciesId: PetSpeciesId, kind: 'idle' | 'hungry' | 'happy' | 'eat' | 'needs' | 'needsBlink') {
  if (petUsesAtlas(speciesId)) return {cell: 320, x: 40, y: 0, size: 560, scale: 1.75}
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
  const legacyId = speciesId as keyof typeof motionRegistration
  const registered = kind === 'hungry' ? sheet : motionRegistration[legacyId][kind]
  const stage = renderLayouts[legacyId],
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
export const petGroundY = (speciesId: PetSpeciesId) => groundOffsets[speciesId].floor

export function petFrameDrawLayout(speciesId: PetSpeciesId, kind: 'idle' | 'happy' | 'eat' | 'needs', frame: number) {
  const layout = petDrawLayout(speciesId, kind)
  const rows = groundOffsets[speciesId]
  const offsets = 'atlas' in rows ? rows.atlas : rows[kind]
  const horizontal = horizontalOffsets[speciesId]
  const dx = 'atlas' in horizontal ? horizontal.atlas : horizontal[kind]
  return {...layout, x: layout.x + dx[frame], y: layout.y + offsets[frame]}
}
