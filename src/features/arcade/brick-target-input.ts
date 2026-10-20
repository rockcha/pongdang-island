/** Convert touch position to existing replay-compatible movement, without teleporting. */
export function brickTargetDirection(current:number,target:number,seconds:number):-1|0|1{
 const distance=target-current
 const tolerance=Math.max(0.5,420*Math.max(0,Math.min(0.05,seconds))/2)
 return Math.abs(distance)<=tolerance?0:distance<0?-1:1
}
