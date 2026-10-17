const fixedFish=new Set(['cloud-shell-home-soot','cloud-teacup-soot','cloud-head-tilt-kodama','cloud-little-log-calcifer','cloud-flame-spirit-calcifer','cloud-masked-forest-san','cloud-lantern-no-face','cloud-cloud-umbrella-totoro','cloud-lotus-umbrella-river-spirit'])
// Explicitly animate reviewed fixed characters even on payloads without idle_animated.
export function cloudferryFixedFrame(id:string,time:number,reduced=false,editing=false){
 return fixedFish.has(id)?reduced||editing?0:Math.floor(Math.max(0,time)*2.4)%4:null
}
