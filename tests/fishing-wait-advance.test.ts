import {expect,it} from 'vitest'
import {newTensionGame,reduceTensionWait,stepTensionGame} from '@/features/fishing/tension-game'

it('advances waiting without resetting elapsed time, seed, grade or tension',()=>{
 const initial={...newTensionGame(()=>.5,{wait:80,rarity:'rare'}),time:5}
 const advanced=reduceTensionWait(initial,10)
 expect(advanced).toEqual({...initial,wait:70})
 expect(initial.wait).toBe(80)
 expect(stepTensionGame(advanced,.1,false).phase).toBe('waiting')
 const ready=reduceTensionWait(advanced,100)
 expect(ready.wait).toBe(0)
 const fight=stepTensionGame(ready,.1,false)
 expect(fight.phase).toBe('playing')
 expect(fight.seed).toBe(initial.seed)
 expect(fight.rarity).toBe('rare')
 expect(reduceTensionWait(fight,10)).toBe(fight)
})

it('cannot skip a terminal phase or advance by a negative or invalid amount',()=>{
 const game=newTensionGame(()=>.5,{wait:20})
 for(const seconds of [-10,0,NaN,Infinity])expect(reduceTensionWait(game,seconds)).toBe(game)
 for(const phase of ['won','lost'] as const){const done={...game,phase};expect(reduceTensionWait(done,10)).toBe(done)}
})
