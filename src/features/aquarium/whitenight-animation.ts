const fixedFish=new Set(['bluegrain-scallop','iceflower-anemone'])
// These reviewed fixed fish animate even when an older payload omits idle_animated.
export function whitenightFixedFrame(id:string,time:number,reduced=false,editing=false){
 return fixedFish.has(id)?reduced||editing?0:Math.floor(Math.max(0,time)*1.2)%4:null
}
