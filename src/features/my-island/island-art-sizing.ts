import {gardenKinds} from './garden-decoration-catalog'
import type { Facility } from './island-model'
import { supportsSavedRotation } from './island-model'

// Keep the illustration's native proportions independent from its grid footprint.
const nativeSizes: Record<string, [number, number]> = {
  'map-table': [2, 1],
  'notice-board': [2, 1],
  'community-board': [2, 1],
  'arcade-cabinet': [2, 2],
  lighthouse: [2, 2],
  destination: [3, 3],
  shipyard: [3, 3],
  shop: [3, 3],
  fuel: [3, 3],
  aquarium: [3, 3],
  bait: [3, 3],
  workshop: [3, 3],
  warehouse: [3, 2],
  dock: [3, 3],
  tree: [2, 2],
  pine: [2, 2],
  flowers: [2, 1],
  pond: [3, 2],
}
export function artGeometry(f: Facility) {
  const [w, h] = nativeSizes[f.kind] ?? [f.w, f.h]
  const sx = f.w / w,
    sy = f.h / h
  const scale = Math.min(sx, sy)
  return {
    w,
    h,
    sx: f.kind === 'dock' ? sx : scale,
    sy: f.kind === 'dock' ? sy : scale,
    x: f.kind === 'dock' ? 0 : (f.w - w * scale) * 16,
    y: f.kind === 'dock' ? 0 : (f.h - h * scale) * 32,
  }
}
export function usesDirectionalFenceArt(f:Facility){return f.kind==='wood-fence'||f.kind==='stone-wall'}
export function buildingRotationTransform(f:Facility,rotation:number){
 const w=f.w*32,h=f.h*32
 return rotation===90?`translate(${h} 0) rotate(90)`:rotation===180?`translate(${w} ${h}) rotate(180)`:`translate(0 ${w}) rotate(270)`
}
export function buildingViewBox(f: Facility, rotation = 0):string {
  rotation = f.kind==='arrow-sign'?0:supportsSavedRotation(f.id) ? rotation : 0
  if(rotation&&!usesDirectionalFenceArt(f)){
    const [x,y,w,h]=buildingViewBox(f,0).split(' ').map(Number),fw=f.w*32,fh=f.h*32
    const points=[[x,y],[x+w,y],[x,y+h],[x+w,y+h]].map(([px,py])=>rotation===90?[fh-py,px]:rotation===180?[fw-px,fh-py]:[py,fw-px])
    const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]),left=Math.min(...xs),top=Math.min(...ys)
    return [left,top,Math.max(...xs)-left,Math.max(...ys)-top].join(' ')
  }
  if(gardenKinds.has(f.kind)){const side=rotation%180===90,w=(side?f.h:f.w)*32,h=(side?f.w:f.h)*32;return `-6 -40 ${w+12} ${h+48}`}
  if(['bridge','stepping-stones','reeds'].includes(f.kind)){const side=rotation%180===90,w=(side?f.h:f.w)*32,h=(side?f.w:f.h)*32;return `-5 -14 ${w+10} ${h+23}`}
  if (f.kind === 'rubber-duck') return '-5 -4 46 40'
  const g = artGeometry(f)
  const box =
    f.kind === 'books' || f.kind === 'stash'
      ? [-12, -12, 56, 56]
      : f.kind === 'lighthouse'
        ? [-10, -85, 90, 170]
        : g.w === 1 && g.h === 1
          ? [-16, -52, 64, 100]
          : g.w === 2 && g.h === 1
            ? [-12, -55, 88, 100]
            : f.kind === 'arcade-cabinet'
              ? [-12, -22, 88, 100]
              : [-18, -65, 140, 180]
  return [box[0] * g.sx + g.x, box[1] * g.sy + g.y, box[2] * g.sx, box[3] * g.sy].join(' ')
}
