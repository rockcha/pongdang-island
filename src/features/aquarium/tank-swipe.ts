export function tankSwipeDirection(dx:number,dy:number,elapsed:number):'previous'|'next'|null{
 if(elapsed>1800||Math.abs(dx)<48||Math.abs(dx)<Math.abs(dy)*1.5)return null
 return dx<0?'next':'previous'
}
