import {expect,it} from 'vitest'
import {BrickSession,verifyBrickReplay,BRICK_TICK} from '@/features/arcade/brick-breaker-replay'
it('replays recorded controls with the same physics regardless of rendering cadence',()=>{
 const session=new BrickSession(12345);session.command('launch');session.command('direction',1)
 for(let i=0;i<60;i++)session.advance(1/60)
 session.command('direction',-1);for(let i=0;i<120;i++)session.advance(BRICK_TICK)
 const actual=verifyBrickReplay(12345,session.replay(),2)
 expect(actual).toEqual({score:session.model.secured,reward:session.model.reward,round:session.model.round,lives:session.model.lives})
 expect(session.inputs.filter(input=>input.action==='direction')).toHaveLength(2)
})
it('rejects invented actions, reversed ticks, excessive duration and fast-forwarded replays',()=>{
 expect(()=>verifyBrickReplay(1,{ticks:1200,inputs:[]},1)).toThrow()
 expect(()=>verifyBrickReplay(1,{ticks:216001,inputs:[]},10000)).toThrow()
 expect(()=>verifyBrickReplay(1,{ticks:10,inputs:[{tick:3,action:'next'},{tick:2,action:'launch'}]},1)).toThrow()
 expect(()=>verifyBrickReplay(1,{ticks:10,inputs:[{tick:0,action:'damage' as 'launch'}]},1)).toThrow()
})
it('never accepts claimed score or lab drops as paid input',()=>{
 expect(verifyBrickReplay(3,{ticks:0,inputs:[]},1)).toMatchObject({score:0,reward:0,lives:3})
 expect(()=>verifyBrickReplay(3,{ticks:1,inputs:[{tick:0,action:'poison' as 'launch'}]},1)).toThrow()
})
