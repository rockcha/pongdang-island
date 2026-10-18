import type { OwnedCollectible } from '@/features/collection/api'
import { createSwimMotion } from './swim-motion'
import { decorationGeometry } from './decoration-geometry'
import {canArrangeSpecies,movementSettings} from './movement-settings'

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
  private sourcePosition:{x:number|null;y:number|null}
  constructor(item: OwnedCollectible, born = 0) {
    this.item = item
    this.sourcePosition={x:item.position_x,y:item.position_y}
    this.born = born
    this.swim = createSwimMotion(item.id, item.animation_seed, Number(item.species.speed), item.species.kind === 'fish')
  }
  setItem(item:OwnedCollectible,now:number,width:number,height:number,reduced=false){
    const changed=item.position_x!==this.sourcePosition.x||item.position_y!==this.sourcePosition.y||(!item.editing&&this.item.editing===true)
    this.sourcePosition={x:item.position_x,y:item.position_y}
    const before=this.item.species,after=item.species
    if(before.movement_type!==after.movement_type||before.travel_direction!==after.travel_direction||before.speed!==after.speed||before.kind!==after.kind){
      this.swim=createSwimMotion(item.id,item.animation_seed,Number(after.speed),after.kind==='fish')
      this.offset={x:0,y:0};this.escape=null;this.initialized=false;this.born=now;this.angle=0;this.mirrored=false
    }
    this.item=item
    if(canArrangeSpecies(item.species))return
    if(changed&&item.position_x!==null&&item.position_y!==null){
      const size=Math.min(item.species.size,width*.4)*Number(item.scale??1)
      this.place(item.position_x*Math.max(0,width-size),item.position_y*Math.max(0,height-size),now,width,height,reduced)
    }
  }
  place(x:number,y:number,now:number,width:number,height:number,reduced=false){
    if(canArrangeSpecies(this.item.species)||this.item.editing){
      const {size,margin,w,h}=decorationGeometry(this.item,width,height)
      const px=Math.max(0,Math.min(w,x-margin)),py=Math.max(0,Math.min(h,y-margin))
      this.item={...this.item,position_x:w?px/w:0,position_y:h?py/h:0}
      this.pose={...this.pose,x:px+margin,y:py+margin,size}
      return {x:this.item.position_x!,y:this.item.position_y!}
    }
    const size=Math.min(this.item.species.size,width*.4)*Number(this.item.scale??1),w=Math.max(0,width-size),h=Math.max(0,height-size)
    const settings=movementSettings(this.item.species)
    if(settings.type!=='swim'||settings.travel!=='both'){
      const px=Math.max(0,Math.min(w,x)),py=Math.max(0,Math.min(h,y))
      const base=this.specialBase(reduced?0:Math.max(0,now-this.born),width,height,false)
      this.offset={x:px-base.x,y:py-base.y};this.escape=null;this.placed=true;this.initialized=true
      this.item={...this.item,position_x:w?px/w:0,position_y:h?py/h:0}
      this.pose={...this.pose,x:px,y:py,size}
      return {x:this.item.position_x!,y:this.item.position_y!}
    }
    const low=Number(this.item.species.swim_y_min),high=Number(this.item.species.swim_y_max)
    const px=Math.max(0,Math.min(w,x)),py=Math.max(0,Math.min(h,y))
    // A new local route starts where the user dropped the inhabitant.
    // Choose a target ahead of the drop, including drops inside the outer zones.
    const direction=px>=w*.94?-1:px<=w*.06?1:this.pose.direction
    this.swim=createSwimMotion(this.item.id,this.item.animation_seed,Number(this.item.species.speed),this.item.species.kind==='fish',{x:w?px/w:0,direction})
    this.born=now;this.mirrored=false
    const motion=this.swim(0)
    this.escape=null;this.placed=true;this.initialized=true
    this.offset={x:px-(this.mirrored?1-motion.x:motion.x)*w,y:py-(low+(high-low)*motion.y)*h}
    this.item={...this.item,position_x:w?px/w:0,position_y:h?py/h:0}
    this.pose={...this.pose,x:px,y:py,size,direction:motion.direction}
    return {x:this.item.position_x!,y:this.item.position_y!}
  }
  flee(x: number, y: number, now: number, radius: number) {
    if (!['fish','trash'].includes(this.item.species.kind)) return
    const settings=movementSettings(this.item.species)
    if(settings.type!=='swim'||settings.travel!=='both')return
    const dx = this.pose.x + this.pose.size / 2 - x, dy = this.pose.y + this.pose.size / 2 - y
    const distance = Math.hypot(dx, dy)
    if (distance > radius) return
    const angle = distance < 1 ? this.item.animation_seed * 2.4 : Math.atan2(dy, dx)
    const strength = 16 + (1 - distance / radius) * 16
    this.escape = { start: now, dx: Math.cos(angle) * strength, dy: Math.sin(angle) * strength, x:this.pose.x,y:this.pose.y }
  }
  private specialBase(time:number,width:number,height:number,withTravelOffset=true){
    const s=this.item.species,settings=movementSettings(s),seed=this.item.animation_seed/1000000
    const size=Math.min(s.size,width*.4)*Number(this.item.scale??1),w=Math.max(0,width-size),h=Math.max(0,height-size)
    const low=Number(s.swim_y_min??.2),high=Number(s.swim_y_max??.8),motion=this.swim(time)
    let x=(.2+seed*.6)*w,y=(low+(high-low)*motion.y)*h,direction=motion.direction
    if(settings.type==='fixed')return {x:(this.item.position_x??(.2+seed*.6))*w,y:(this.item.position_y??(s.kind==='fish'?(low+high)/2:.5))*h,direction:1}
    if(settings.type==='crawl'){x=motion.x*w;y=(low+high)/2*h}
    if(settings.type==='pulse'){
      // Gentle short vertical pulses, carried along an individual, slowly
      // changing horizontal current instead of traversing the full depth range.
      const current=this.swim(time*.25)
      const duration=Math.max(24,Math.min(120,1.5/Math.max(Number(s.speed),.001)))*(.9+seed*.2)
      const phase=(time/duration+seed)%1
      const p=phase<.42?phase/.42:(phase-.42)/.58
      const blend=p*p*(3-2*p)
      const depth=Math.max(.12,Math.min(.88,current.y))
      const pulse=(phase<.42?1-blend:blend)-.5
      x=current.x*w
      y=(low+(high-low)*(.35+depth*.3+pulse*.10))*h
      direction=current.direction
    }
    if(settings.travel!=='both'){
      const span=width+size,offset=withTravelOffset?this.offset.x*(settings.travel==='right'?1:-1):0
      const progress=((seed*span+time*Math.max(Number(s.speed),.001)*width+offset)%span+span)%span
      x=settings.travel==='right'?progress-size:width-progress;direction=settings.travel==='right'?1:-1
    }else if(settings.type==='swim')x=motion.x*w
    return {x,y,direction}
  }
  update(now: number, delta: number, width: number, height: number, reduced = false): InhabitantMotion['pose'] {
    const s = this.item.species, seed = this.item.animation_seed / 1000000
    const size = Math.min(s.size, width * .4)*Number(this.item.scale??1)
    const w = Math.max(0, width - size), h = Math.max(0, height - size)
    if(!this.initialized&&this.item.position_x!==null&&this.item.position_y!==null&&!canArrangeSpecies(s)&&!this.item.editing){
      this.place(this.item.position_x*w,this.item.position_y*h,now,width,height,reduced)
    }
    const time = reduced ? 0 : Math.max(0, now - this.born)
    const motion = this.swim(time)
    let x: number, y: number, direction = motion.direction, angle = 0
    if (canArrangeSpecies(s)||this.item.editing) {
      const geometry=decorationGeometry(this.item,width,height)
      x = geometry.margin+(this.item.position_x ?? (.2 + seed * .6))*geometry.w
      y = geometry.margin+(this.item.position_y ?? (s.kind==='fish'?(Number(s.swim_y_min??.2)+Number(s.swim_y_max??.8))/2:.86))*geometry.h
      this.pose={x,y,size:geometry.size,direction:1,angle:geometry.angle,frame:!reduced&&!this.item.editing&&s.idle_animated?Math.floor(time*1.2)%4:0}
      return this.pose
    }
    const settings=movementSettings(s)
    if(settings.type!=='swim'||settings.travel!=='both'){
      const base=this.specialBase(time,width,height),oneWay=settings.travel!=='both'
      const fixed=settings.type==='fixed'
      this.pose={x:fixed||oneWay?base.x:Math.max(0,Math.min(w,base.x+this.offset.x)),
        y:fixed?base.y:Math.max(0,Math.min(h,base.y+this.offset.y)),size,direction:base.direction,angle:0,
        frame:fixed||reduced?0:Math.floor(settings.type==='pulse'?time*1.6:motion.framePhase)%4}
      return this.pose
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
      if (s.kind === 'fish' && settings.flip && !reduced) {
        // A turn or pause must not pitch a large sprite up and down.
        // Depth changes stay in the path; only a tap escape briefly tilts the body.
        this.angle += (0 - this.angle) * (1 - Math.exp(-Math.min(delta, .1) * 3))
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
            angle = settings.flip?Math.max(-30, Math.min(30, Math.atan2(escape.dy, Math.max(Math.abs(escape.dx), 1)) * 180 / Math.PI * direction)):0
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
