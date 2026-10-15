import {it,expect} from 'vitest'
import {InhabitantMotion} from '../src/features/aquarium/inhabitant-motion'
import type {OwnedCollectible} from '../src/features/collection/api'
it('compares displayed motion for filefish and the new species',()=>{
 for(const [id,size,speed,low,high] of [['round-filefish',64,.04,.35,.75],['pongdang-shark',156,.038,.2,.75],['pongdang-whale',172,.028,.18,.72],['pongi-explorer',176,.032,.22,.78]] as const){
 const entity:OwnedCollectible={id:'same-individual',species_id:id,tank_id:'tank',animation_seed:240000,position_x:null,position_y:null,acquired_at:'',species:{id,kind:'fish',name:id,description:'',swim_y_min:low,swim_y_max:high,speed,size,rarity:'epic',sprite_sheet_path:null,thumbnail_path:'',sell_price:0}}
 const motion=new InhabitantMotion(entity)
 let previous={...motion.update(0,0,448,600)},maxY=0,maxAngle=0
 for(let i=1;i<7200;i++){
 const next={...motion.update(i/60,1/60,448,600)}
 maxY=Math.max(maxY,Math.abs(next.y-previous.y));maxAngle=Math.max(maxAngle,Math.abs(next.angle-previous.angle));previous=next
 }
 expect(maxAngle).toBe(0)
 expect(maxY).toBeLessThan(.1)
 }
})
