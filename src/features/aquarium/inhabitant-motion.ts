import type { OwnedCollectible } from '@/features/collection/api'
import { createSwimMotion } from './swim-motion'

export class InhabitantMotion {
  private swim: ReturnType<typeof createSwimMotion>
  private offset = { x: 0, y: 0 }
  private escape: { start: number; dx: number; dy: number; x: number; y: number } | null = null
  private angle = 0
  private mirrored = false
  private placed = false
  private initialized = false
  pose = { x: 0, y: 0, size: 0, direction: 1, angle: 0, frame: 0 }
  item: OwnedCollectible
  private born: number
  constructor(item: OwnedCollectible, born = 0) {
    this.item = item
    this.born = born
    this.swim = createSwimMotion(item.id, item.animation_seed, Number(item.species.speed), item.species.kind === 'fish')
  }
  setItem(item:OwnedCollectible,now:number,width:number,height:number,reduced=false){
    const changed=item.position_x!==this.item.position_x||item.position_y!==this.item.position_y
    this.item=item
    if(changed&&item.position_x!==null&&item.position_y!==null){
      const size=Math.min(item.species.size,width*.4)
      this.place(item.position_x*Math.max(0,width-size),item.position_y*Math.max(0,height-size),now,width,height,reduced)
    }
  }
  place(x:number,y:number,now:number,width:number,height:number,reduced=false){
    const size=Math.min(this.item.species.size,width*.4),w=Math.max(0,width-size),h=Math.max(0,height-size)
    const motion=this.swim(reduced?0:Math.max(0,now-this.born))
    const low=Number(this.item.species.swim_y_min),high=Number(this.item.species.swim_y_max)
    const px=Math.max(0,Math.min(w,x)),py=Math.max(0,Math.min(h,y))
    this.escape=null;this.placed=true;this.initialized=true
    this.offset={x:px-(this.mirrored?1-motion.x:motion.x)*w,y:py-(low+(high-low)*motion.y)*h}
    this.item={...this.item,position_x:w?px/w:0,position_y:h?py/h:0}
    this.pose={...this.pose,x:px,y:py,size}
    return {x:this.item.position_x!,y:this.item.position_y!}
  }
  flee(x: number, y: number, now: number, radius: number) {
    if (!['fish','trash'].includes(this.item.species.kind)) return
    const dx = this.pose.x + this.pose.size / 2 - x, dy = this.pose.y + this.pose.size / 2 - y
    const distance = Math.hypot(dx, dy)
    if (distance > radius) return
    const angle = distance < 1 ? this.item.animation_seed * 2.4 : Math.atan2(dy, dx)
    const strength = 16 + (1 - distance / radius) * 16
    this.escape = { start: now, dx: Math.cos(angle) * strength, dy: Math.sin(angle) * strength, x:this.pose.x,y:this.pose.y }
  }
  update(now: number, delta: number, width: number, height: number, reduced = false) {
    const s = this.item.species, seed = this.item.animation_seed / 1000000
    const time = reduced ? 0 : Math.max(0, now - this.born)
    const motion = this.swim(time), size = Math.min(s.size, width * .4)
    const w = Math.max(0, width - size), h = Math.max(0, height - size)
    if(!this.initialized&&this.item.position_x!==null&&this.item.position_y!==null&&s.kind!=='structure'){
      this.place(this.item.position_x*w,this.item.position_y*h,now,width,height,reduced)
    }
    let x: number, y: number, direction = motion.direction, angle = 0
    if (s.kind === 'structure') {
      x = (this.item.position_x ?? (.2 + seed * .6)) * w
      y = (this.item.position_y ?? .86) * h
    } else {
      const low = Number(s.swim_y_min), high = Number(s.swim_y_max)
      const baseY=(low+(high-low)*motion.y)*h
      if(this.escape&&!reduced&&now-this.escape.start>=1.8){
        const escape=this.escape
        if(s.kind==='fish')this.mirrored=motion.direction!==(escape.dx>=0?1:-1)
        this.offset={x:escape.x+escape.dx*1.23-(this.mirrored?1-motion.x:motion.x)*w,y:escape.y+escape.dy*1.23-baseY}
        this.escape=null
      }
      direction=this.mirrored?-motion.direction:motion.direction
      x = (this.mirrored?1-motion.x:motion.x) * w; y = baseY
      if (s.kind === 'fish' && !reduced) {
        const target = Math.max(-10, Math.min(10, Math.atan2(motion.velocityY * (high - low) * h, Math.max(Math.abs(motion.velocityX * w), 4)) * 180 / Math.PI * direction))
        this.angle += (target - this.angle) * (1 - Math.exp(-Math.min(delta, .1) * 3))
        angle = this.angle
      }
      if (['fish','trash'].includes(s.kind)) {
        if (this.escape) {
          const escape = this.escape, age = Math.max(0, now - escape.start)
          const progress = Math.min(1, age / .65), push = progress ** 2 * (3 - 2 * progress)
          const drift=Math.max(0,age-.65)*.2
          this.offset = { x: escape.x + escape.dx * (push+drift)-x, y: escape.y + escape.dy * (push+drift)-y }
          if (s.kind==='fish') {
            direction = escape.dx >= 0 ? 1 : -1
            angle = Math.max(-30, Math.min(30, Math.atan2(escape.dy, Math.max(Math.abs(escape.dx), 1)) * 180 / Math.PI * direction))
            this.angle=angle
          }
        }
        const baseX = x, baseY = y
        x = Math.max(0, Math.min(w, x + this.offset.x))
        y = Math.max((this.placed?0:low) * h, Math.min((this.placed?1:high) * h, y + this.offset.y))
        this.offset = { x: x - baseX, y: y - baseY }
      }
      if (s.kind === 'trash') angle = time * 25 + seed * 360
    }
    this.pose = { x, y, size, direction, angle, frame: reduced ? 0 : Math.floor(motion.framePhase) % 4 }
    return this.pose
  }
}
