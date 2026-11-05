import {objectArtHeight,TILE,topviewItems,type TopviewObject} from './topview-model'

export function farmWorkPosition(object:TopviewObject){
 const item=topviewItems[object.kind]
 return object.kind==='plot'?{x:(object.x+.78)*TILE,y:object.y*TILE+6}:{x:(object.x+item.w/2)*TILE,y:(object.y+item.h)*TILE-objectArtHeight(object.kind)-9}
}
export function formatFarmRemaining(seconds:number){
 const total=Math.max(0,Math.ceil(seconds)),hours=Math.floor(total/3600),minutes=Math.floor(total%3600/60),rest=total%60
 return `${hours?`${hours}시간 `:''}${hours||minutes?`${minutes}분 `:''}${rest}초`
}
