import type { OwnedCollectible } from '@/features/collection/api'
import { inhabitantBaseSize } from './inhabitant-size'

// Keep even rotated decorations inside the glass, including on narrow screens.
export function decorationGeometry(item:OwnedCollectible,width:number,height:number){
 const scale=Math.max(.5,Math.min(2,Number(item.scale??1)))
 const angle=Number(item.rotation??0)
 const radians=angle*Math.PI/180
 const factor=Math.abs(Math.cos(radians))+Math.abs(Math.sin(radians))
 const size=Math.min(inhabitantBaseSize(item.species,width)*scale,Math.min(width,height)/factor)
 const bounds=size*factor
 return {size,angle,margin:(bounds-size)/2,w:Math.max(0,width-bounds),h:Math.max(0,height-bounds)}
}
