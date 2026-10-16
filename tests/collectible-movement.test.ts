import {expect,it} from 'vitest'
import {InhabitantMotion} from '@/features/aquarium/inhabitant-motion'
import {shouldFlipSpecies} from '@/features/aquarium/movement-settings'
import type {OwnedCollectible,Species} from '@/features/collection/api'
const base:OwnedCollectible={id:'example',species_id:'example',tank_id:'tank',animation_seed:240000,position_x:null,position_y:null,acquired_at:'',species:{id:'example',kind:'fish',name:'개체',description:'',swim_y_min:.2,swim_y_max:.8,speed:.05,size:60,rarity:'common',sprite_sheet_path:'sheet.png',thumbnail_path:'thumb.png',sell_price:30}}
const item=(settings:Partial<Species>)=>({...base,species:{...base.species,...settings}})
it('drifts diagonally with slow shallow pulses, smooth turns and no rotation',()=>{
 const motion=new InhabitantMotion(item({movement_type:'pulse',flip_with_direction:false}))
 const poses=Array.from({length:1800},(_,i)=>({...motion.update(i*.1,.1,400,600)}))
 expect(Math.max(...poses.map(p=>p.x))-Math.min(...poses.map(p=>p.x))).toBeGreaterThan(70)
 const verticalRange=Math.max(...poses.map(p=>p.y))-Math.min(...poses.map(p=>p.y))
 expect(verticalRange).toBeGreaterThan(20)
 expect(verticalRange).toBeLessThan(130)
 const deltas=poses.slice(1).map((pose,i)=>({dx:pose.x-poses[i].x,dy:pose.y-poses[i].y}))
 expect(deltas.some(({dx,dy})=>Math.abs(dx)>.01&&dy<-.01)).toBe(true)
 expect(deltas.some(({dx,dy})=>Math.abs(dx)>.01&&dy>.01)).toBe(true)
 expect(deltas.every(({dy})=>Math.abs(dy)<1.5)).toBe(true)
 expect(poses.every(p=>p.angle===0&&p.y>=.2*540&&p.y<=.8*540)).toBe(true)
 expect(motion.update(50,.1,400,600,true)).toEqual(motion.update(80,.1,400,600,true))
})
it('gives pulse individuals different drifting paths',()=>{
 const settings={movement_type:'pulse' as const,flip_with_direction:false}
 const first=new InhabitantMotion(item(settings))
 const other=new InhabitantMotion({...item(settings),id:'another-jellyfish',animation_seed:710000})
 const a={...first.update(15,.1,400,600)},b={...other.update(15,.1,400,600)}
 expect(Math.hypot(a.x-b.x,a.y-b.y)).toBeGreaterThan(20)
})
it('crawls horizontally at one depth and respects non-flipping artwork',()=>{
 const entity=item({movement_type:'crawl',facing_direction:'front',flip_with_direction:false,swim_y_min:.86,swim_y_max:.92})
 const motion=new InhabitantMotion(entity)
 const poses=Array.from({length:80},(_,i)=>({...motion.update(i,.1,400,600)}))
 expect(new Set(poses.map(p=>p.y)).size).toBe(1)
 expect(Math.max(...poses.map(p=>p.x))-Math.min(...poses.map(p=>p.x))).toBeGreaterThan(100)
 expect(poses.every(p=>p.angle===0)).toBe(true)
 expect(shouldFlipSpecies(entity.species,-1)).toBe(true)
 expect(shouldFlipSpecies(base.species,-1)).toBe(true)
})
it('keeps fixed individuals still, ignores taps, and restores dragged placement',()=>{
 const entity=item({movement_type:'fixed'})
 const motion=new InhabitantMotion(entity)
 const first={...motion.update(0,0,400,600)}
 motion.flee(first.x,first.y,0,180)
 expect(motion.update(50,.1,400,600)).toEqual(first)
 const position=motion.place(170,220,50,400,600)
 expect(motion.update(51,.1,400,600)).toMatchObject({x:170,y:220,frame:0})
 const restored=new InhabitantMotion({...entity,position_x:position.x,position_y:position.y})
 expect(restored.update(0,0,400,600)).toMatchObject({x:170,y:220})
})
it.each(['left','right'] as const)('moves only %s, wraps, and continues from drag without jumping',direction=>{
 const entity=item({travel_direction:direction})
 const motion=new InhabitantMotion(entity)
 let previous={...motion.update(0,0,400,600)},wraps=0
 for(let time=.1;time<60;time+=.1){
  const current={...motion.update(time,.1,400,600)},dx=current.x-previous.x
  if(Math.abs(dx)>400)wraps++
  else expect(direction==='right'?dx>=0:dx<=0).toBe(true)
  expect(current.direction).toBe(direction==='right'?1:-1)
  previous=current
 }
 expect(wraps).toBeGreaterThan(0)
 motion.place(150,250,60,400,600)
 expect(motion.update(60,0,400,600).x).toBeCloseTo(150)
 const next=motion.update(60.01,.01,400,600)
 expect(Math.abs(next.x-150)).toBeLessThan(1)
})
it.each(['pulse','crawl'] as const)('restores and retains dragged %s positions',movement_type=>{
 const entity={...item({movement_type}),position_x:.4,position_y:.6}
 const motion=new InhabitantMotion(entity)
 expect(motion.update(0,0,400,600)).toMatchObject({x:136,y:324})
 motion.place(200,300,1,400,600)
 expect(motion.update(1,0,400,600)).toMatchObject({x:200,y:300})
})

it('keeps a rotated fixed fish at its exact drop position across selection and reload',()=>{
 const entity={...item({movement_type:'fixed'}),rotation:45,scale:1.4,position_x:.3,position_y:.4}
 const motion=new InhabitantMotion(entity)
 motion.update(0,0,400,600)
 const dropped=motion.place(170,240,1,400,600)
 const pose={...motion.update(1,0,400,600)}
 expect(pose.x).toBeCloseTo(170)
 expect(pose.y).toBeCloseTo(240)
 const saved={...entity,position_x:dropped.x,position_y:dropped.y}
 motion.setItem({...saved,editing:true},2,400,600)
 expect(motion.update(2,0,400,600)).toEqual(pose)
 motion.setItem(saved,3,400,600)
 expect(motion.update(3,0,400,600)).toEqual(pose)
 expect(new InhabitantMotion(saved).update(0,0,400,600)).toEqual(pose)
})

it('animates an opted-in fixed giant crab without changing its coordinates',()=>{
 const crab={...item({movement_type:'fixed',idle_animated:true}),position_x:.4,position_y:.85}
 const motion=new InhabitantMotion(crab)
 const poses=[0,1,2,3].map(t=>({...motion.update(t,1/60,400,600)}))
 expect(new Set(poses.map(p=>p.frame)).size).toBe(4)
 expect(new Set(poses.map(p=>p.x)).size).toBe(1)
 expect(new Set(poses.map(p=>p.y)).size).toBe(1)
 expect(motion.update(5,0,400,600,true).frame).toBe(0)
 motion.setItem({...crab,editing:true},6,400,600)
 expect(motion.update(6,0,400,600).frame).toBe(0)
})

it('animates rooted anemone tentacles while keeping decoration placement and rotation fixed',()=>{
 const anemone={...item({kind:'decoration',movement_type:'fixed',idle_animated:true,sprite_sheet_path:'decorations/rare/coral-flower-anemone_sprite.png'}),position_x:.3,position_y:.6,rotation:30,scale:1.2}
 const motion=new InhabitantMotion(anemone)
 const a={...motion.update(0,0,400,600)},b={...motion.update(1,0,400,600)}
 expect(b.frame).not.toBe(a.frame)
 expect({...b,frame:0}).toEqual({...a,frame:0})
})
