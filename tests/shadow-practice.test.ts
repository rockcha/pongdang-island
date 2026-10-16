import { expect, it } from 'vitest'
import { createShadowPractice } from '@/features/arcade/shadow-practice'
const catalog=['a','b','c','d'].map(id=>({id,name:id,kind:'fish',thumbnail_path:id+'.png'}))
it('runs practice locally to 100, excludes maps and stops without losing lives',()=>{
 const play=createShadowPractice([...catalog,{id:'map',name:'map',kind:'map',thumbnail_path:'map.png'}])
 let run=play({p_action:'start'}).run!
 for(let i=0;i<100;i++){
  expect(run.round.options.some(o=>o.id==='map')).toBe(false)
  run=play({p_action:'answer',p_round_id:run.round.id,p_choice_id:run.round.imagePath.replace('.png','')}).run!
  if(i<99)run=play({p_action:'next',p_round_id:run.round.id}).run!
 }
 expect(run).toMatchObject({score:100,lives:3,finished:true})
 expect(play({p_action:'next',p_round_id:run.round.id}).run!.score).toBe(100)
 expect(play({p_action:'start'}).run).toMatchObject({score:0,lives:3,finished:false,round:{number:1}})
})
it('ends practice after three wrong answers and rejects a short pool',()=>{
 const play=createShadowPractice(catalog)
 let run=play({p_action:'start'}).run!
 for(let i=0;i<3;i++){
  run=play({p_action:'answer',p_round_id:run.round.id,p_choice_id:run.round.options.find(o=>o.id+'.png'!==run.round.imagePath)!.id}).run!
  if(i<2)run=play({p_action:'next',p_round_id:run.round.id}).run!
 }
 expect(run).toMatchObject({score:0,lives:0,finished:true})
 expect(()=>createShadowPractice(catalog.slice(0,3))).toThrow('SHADOW_POOL_UNAVAILABLE')
})
