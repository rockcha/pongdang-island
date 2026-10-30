const paths=new Set(['pharaoh-gold-wing-horus','pharaoh-gatekeeper-anubis','pharaoh-obelisk-colossus','pharaoh-solar-scarab'].map(id=>`fish/mythic/${id}_swim8_sprite.png`))
const glide=[0,1,2,3,2,1] as const
// Prepare, hold the awakened pose, then recover through both return drawings.
// A neutral bridge connects the action to the next four-second basic loop.
const flourish=[4,4,5,5,5,5,5,6,6,7,7,0] as const
export function pharaohMythicFrame(path:string,phase:number){
 if(!paths.has(path))return null
 return phase<4?glide[Math.floor(phase*3)%glide.length]:flourish[Math.min(flourish.length-1,Math.floor((phase-4)*6))]
}
