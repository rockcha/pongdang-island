// Stable per-individual randomness: never generate new random values per frame.
export function createSwimMotion(id: string, seed: number, speed: number, varied = true, start?:{x:number;direction:number}) {
  let hash = seed >>> 0
  for (let i = 0; i < id.length; i++) hash = Math.imul(hash ^ id.charCodeAt(i), 16777619) >>> 0
  function random(index: number) {
    let value = (hash + Math.imul(index + 1, 0x9e3779b9)) >>> 0
    value = Math.imul(value ^ (value >>> 16), 0x21f0aaad)
    value = Math.imul(value ^ (value >>> 15), 0x735a2d97)
    return ((value ^ (value >>> 15)) >>> 0) / 4294967296
  }
  const duration = Math.max(5, (0.45 + random(0) * 0.2) / Math.max(speed, 0.001))
  // Spawn uniformly instead of sampling an eased route, which concentrates
  // new fish near the same two turning zones.
  const spawnX=start?.x??(.04+random(1)*.92)
  const firstSide = start ? (start.direction>=0?0:1) : spawnX<.5?0:1
  // Alternate between broad left/right zones so nearby targets cannot stall swimming.
  const waypoint = (index: number) => ({
    x: index===0 ? spawnX : index===1&&start ? (start.direction>=0?Math.min(1,Math.max(start.x+.06,.72+random(4)*.22)):Math.max(0,Math.min(start.x-.06,.06+random(4)*.22))) : ((index + firstSide) % 2 === 0 ? 0.03 : 0.74) + random(index * 2 + 2) * 0.23,
  })
  // Decide behavior once per six-second interval, independently for each individual.
  const totals=[0],depthTotals=[0]
  function interval(index:number, elapsed:number){
    const roll=random(index+30000)
    const cruising=.8+random(index+40000)*.3
    if(roll<.3){
      const pause=2+random(index+50000)*2
      const moving=Math.max(0,elapsed-pause)
      const ramp=Math.min(1,moving/.8)
      const distance=cruising*(.8*(ramp**3-ramp**4/2)+Math.max(0,moving-.8))
      const rate=cruising*ramp*ramp*(3-2*ramp)
      return {distance,rate,depthDistance:distance,depthRate:rate,behavior:moving===0?'rest':'cruise'}
    }
    if(roll>.92){
      const burst=1.2,part=Math.min(elapsed,burst)
      return {distance:cruising*elapsed+3*(part/2-burst*Math.sin(2*Math.PI*part/burst)/(4*Math.PI)),
        rate:cruising+(elapsed<burst?3*Math.sin(Math.PI*elapsed/burst)**2:0),depthDistance:cruising*elapsed,depthRate:cruising,behavior:elapsed<burst?'dart':'cruise'}
    }
    return {distance:cruising*elapsed,rate:cruising,depthDistance:cruising*elapsed,depthRate:cruising,behavior:'cruise'}
  }
  return (time: number) => {
    const realTime=Math.max(0,time)
    const block=Math.floor(realTime/6)
    if(varied)while(totals.length<=block){const index=totals.length-1,step=interval(index,6);totals.push(totals[index]+step.distance);depthTotals.push(depthTotals[index]+step.depthDistance)}
    const activity=varied?interval(block,realTime%6):{distance:realTime,rate:1,depthDistance:realTime,depthRate:1,behavior:'cruise'}
    // Short horizontal bursts must not turn a broad depth change into a dive.
    const depthTime=varied?depthTotals[block]+activity.depthDistance:realTime
    time=varied?totals[block]+activity.distance:realTime
    const phase = Math.max(0, time) / duration
    const segment = Math.floor(phase)
    const progress = phase - segment
    const blend = progress * progress * (3 - 2 * progress)
    const from = waypoint(segment), to = waypoint(segment + 1)
    // Use most of the species' permitted depth band. Each fish changes depth
    // on its own slow schedule, keeping large vertical journeys gentle.
    const verticalDuration = Math.max(64,duration*(5+random(6)*3))
    const verticalPhase = depthTime / verticalDuration
    const verticalSegment = Math.floor(verticalPhase)
    const verticalProgress = verticalPhase - verticalSegment
    const verticalBlend = verticalProgress ** 2 * (3 - 2 * verticalProgress)
    const depthAt=(index:number)=>.04+random(index+20000)*.92
    const fromY = depthAt(verticalSegment)
    const toY = depthAt(verticalSegment+1)
    return {
      x: from.x + (to.x - from.x) * blend,
      y: fromY + (toY - fromY) * verticalBlend,
      velocityX: (to.x - from.x) * 6 * progress * (1 - progress) / duration*activity.rate,
      velocityY: (toY - fromY) * 6 * verticalProgress * (1 - verticalProgress) / verticalDuration*activity.depthRate,
      behavior:activity.behavior,
      direction: to.x >= from.x ? 1 : -1,
      // Keep fins moving slowly at rest and accelerate them with swimming, without phase jumps.
      framePhase: 1.6 * realTime + 1.4 * time + random(5) * 4,
    }
  }
}
