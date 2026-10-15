// Stable per-individual randomness: never generate new random values per frame.
export function createSwimMotion(id: string, seed: number, speed: number, varied = true) {
  let hash = seed >>> 0
  for (let i = 0; i < id.length; i++) hash = Math.imul(hash ^ id.charCodeAt(i), 16777619) >>> 0
  function random(index: number) {
    let value = (hash + Math.imul(index + 1, 0x9e3779b9)) >>> 0
    value = Math.imul(value ^ (value >>> 16), 0x21f0aaad)
    value = Math.imul(value ^ (value >>> 15), 0x735a2d97)
    return ((value ^ (value >>> 15)) >>> 0) / 4294967296
  }
  const duration = Math.max(5, (0.45 + random(0) * 0.2) / Math.max(speed, 0.001))
  const offset = random(1) * duration
  const firstSide = random(7) < 0.5 ? 0 : 1
  // Alternate between broad left/right zones so nearby targets cannot stall swimming.
  const waypoint = (index: number) => ({
    x: ((index + firstSide) % 2 === 0 ? 0.06 : 0.72) + random(index * 2 + 2) * 0.22,
  })
  // Decide behavior once per six-second interval, independently for each individual.
  const totals=[0]
  function interval(index:number, elapsed:number){
    const roll=random(index+30000)
    const cruising=.8+random(index+40000)*.3
    if(roll<.3){
      const pause=2+random(index+50000)*2
      const moving=Math.max(0,elapsed-pause)
      const ramp=Math.min(1,moving/.8)
      return {distance:cruising*(.8*(ramp**3-ramp**4/2)+Math.max(0,moving-.8)),
        rate:cruising*ramp*ramp*(3-2*ramp),behavior:moving===0?'rest':'cruise'}
    }
    if(roll>.92){
      const burst=1.2,part=Math.min(elapsed,burst)
      return {distance:cruising*elapsed+3*(part/2-burst*Math.sin(2*Math.PI*part/burst)/(4*Math.PI)),
        rate:cruising+(elapsed<burst?3*Math.sin(Math.PI*elapsed/burst)**2:0),behavior:elapsed<burst?'dart':'cruise'}
    }
    return {distance:cruising*elapsed,rate:cruising,behavior:'cruise'}
  }
  return (time: number) => {
    const realTime=Math.max(0,time)
    const block=Math.floor(realTime/6)
    if(varied)while(totals.length<=block){const index=totals.length-1;totals.push(totals[index]+interval(index,6).distance)}
    const activity=varied?interval(block,realTime%6):{distance:realTime,rate:1,behavior:'cruise'}
    time=varied?totals[block]+activity.distance:realTime
    const phase = (Math.max(0, time) + offset) / duration
    const segment = Math.floor(phase)
    const progress = phase - segment
    const blend = progress * progress * (3 - 2 * progress)
    const from = waypoint(segment), to = waypoint(segment + 1)
    // Stay near an individual cruising depth, with only very slow, shallow course changes.
    const verticalDuration = duration * (6 + random(6) * 2)
    const verticalPhase = (Math.max(0, time) + random(8) * verticalDuration) / verticalDuration
    const verticalSegment = Math.floor(verticalPhase)
    const verticalProgress = verticalPhase - verticalSegment
    const verticalBlend = verticalProgress ** 2 * (3 - 2 * verticalProgress)
    const depth = .2 + random(9) * .6
    const fromY = depth + (random(verticalSegment + 20000) - .5) * .08
    const toY = depth + (random(verticalSegment + 20001) - .5) * .08
    return {
      x: from.x + (to.x - from.x) * blend,
      y: fromY + (toY - fromY) * verticalBlend,
      velocityX: (to.x - from.x) * 6 * progress * (1 - progress) / duration*activity.rate,
      velocityY: (toY - fromY) * 6 * verticalProgress * (1 - verticalProgress) / verticalDuration*activity.rate,
      behavior:activity.behavior,
      direction: to.x >= from.x ? 1 : -1,
      // Keep fins moving slowly at rest and accelerate them with swimming, without phase jumps.
      framePhase: 1.6 * realTime + 1.4 * time + random(5) * 4,
    }
  }
}
