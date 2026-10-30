import { FARM_TILE, toIso } from './isometric'
import { facilityFor, footprint, type Placement } from '../my-island/island-model'

type GroundRegistration = {
  front: [number, number]
  left: [number, number]
  right: [number, number]
}
// Pixel positions on the packed 256px frames. Register the stone foundation,
// not the alpha bounds (flowers, chimneys and props are not ground contacts).
export const buildingRegistration: Record<string, GroundRegistration[]> = {
  'farm-office': [
    { front: [139, 235], left: [56, 188], right: [223, 187] },
    { front: [133, 235], left: [54, 189], right: [218, 188] },
    { front: [127, 235], left: [50, 189], right: [220, 184] },
    { front: [118, 235], left: [38, 189], right: [204, 187] },
  ],
  'farm-store': [
    { front: [144, 235], left: [35, 185], right: [226, 187] },
    { front: [135, 235], left: [36, 188], right: [223, 186] },
    { front: [128, 235], left: [35, 188], right: [226, 187] },
    { front: [118, 235], left: [34, 185], right: [225, 187] },
  ],
  'farm-barn': [
    { front: [158, 237], left: [26, 177], right: [233, 202] },
    { front: [104, 237], left: [34, 203], right: [226, 177] },
    { front: [154, 237], left: [29, 177], right: [227, 201] },
    { front: [103, 237], left: [34, 204], right: [228, 177] },
  ],
}
export function spritePlacement(p: Placement) {
  const facility = facilityFor(p.id),
    id = facility?.id ?? '',
    f = footprint(p)
  const frame = ((((p.rotation ?? 0) / 90) % 4) + 4) % 4
  const ground = buildingRegistration[id]?.[frame]
  if (ground) {
    // Both sides stay inside the owned cells, including rectangular quarter turns.
    const scale =
      Math.min(
        ...buildingRegistration[id].map((r, i) => {
          const w = i % 2 ? facility!.h : facility!.w,
            h = i % 2 ? facility!.w : facility!.h
          return Math.min(
            (w * FARM_TILE.width) / 2 / (r.front[0] - r.left[0]),
            (h * FARM_TILE.width) / 2 / (r.right[0] - r.front[0]),
          )
        }),
      ) * 0.96
    const cameraScale = id === 'farm-barn' ? 1.22 : id === 'farm-store' ? 1.1 : 1
    return {
      anchor: toIso(p.x + f.w, p.y + f.h),
      size: scale * 256,
      height: scale * 256 * cameraScale,
      ground: ground.front,
      building: true,
    }
  }
  const size = id === 'farm-chicken' ? 55 : id === 'farm-sheep' ? 72 : id === 'farm-cow' ? 106 : 64
  return {
    anchor: toIso(p.x + f.w / 2, p.y + f.h / 2),
    size,
    height: size,
    ground: [128, 238] as [number, number],
    building: false,
  }
}
