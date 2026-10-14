export function tankSwipeDirection(dx:number,dy:number,elapsed:number):'previous'|'next'|null{
 if(elapsed>900||Math.abs(dx)<60||Math.abs(dx)<Math.abs(dy)*1.5)return null
 return dx<0?'next':'previous'
}
