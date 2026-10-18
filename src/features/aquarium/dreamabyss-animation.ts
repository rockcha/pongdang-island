const animatedDecorations=new Set(['violet-hydrothermal-vent','moonlit-pearl-clam','primordial-amethyst-heart'])

/** Animate only the plume/light; placement and editing stay stationary. */
export function dreamabyssFixedFrame(id:string,time:number,reduced=false,editing=false){
 if(!animatedDecorations.has(id))return null
 return reduced||editing?0:Math.floor(time*1.5)%4
}
