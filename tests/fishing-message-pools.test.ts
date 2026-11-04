import {expect,it,vi} from 'vitest'
import {fishingMessagePools,type FishingMessageState} from '@/features/fishing/fishing-message-pools'
import {fishingMessage} from '@/features/fishing/fishing-messages'
import {fishBehavior,fishingBiteSeconds,fishingSchedule,newTensionGame,type TensionGame} from '@/features/fishing/tension-game'
import type {Rarity} from '@/lib/game/rarity'
const grades:Rarity[]=['common','rare','epic','mythic']
const states:FishingMessageState[]=['approach','calm','warning','surge','recover']
it('provides exactly 600 distinct authored lines across 20 grade/state pools',()=>{
 const all:string[]=[]
 for(const rarity of grades)for(const state of states){
  const pool=fishingMessagePools[rarity][state]
  expect(pool).toHaveLength(30)
  for(const line of pool){expect(line.trim()).toBe(line);expect(line.length).toBeGreaterThan(5);expect(line).not.toMatch(/지느러미|비늘|아가미/)}
  all.push(...pool)
 }
 expect(all).toHaveLength(600);expect(new Set(all).size).toBe(600)
})
it('uses grade-specific approach and warning lines before the first struggle',()=>{
 for(const rarity of grades)for(const seed of [1,42,1234]){
  const base={...newTensionGame(()=>.5),seed,rarity,phase:'playing' as const}
  expect(fishingMessagePools[rarity].approach).toContain(fishingMessage({...base,time:.1}))
  expect(fishingMessagePools[rarity].warning).toContain(fishingMessage({...base,time:fishingBiteSeconds(seed)*.8}))
 }
})
it('keeps recovery or calm commentary stable throughout a real rest interval',()=>{
 const found=new Set<string>()
 for(const seed of [40,41]){
  const rarity='mythic' as const,schedule=fishingSchedule(seed,rarity)
  let elapsed=0
  for(const stage of schedule){
   if(stage.mood==='recover'){
    const game={...newTensionGame(()=>.5),seed,rarity,phase:'playing' as const,time:elapsed+.1}
    const message=fishingMessage(game)
    const state=fishingMessagePools[rarity].calm.some(t=>t===message)?'calm':'recover'
    found.add(state);expect(fishingMessagePools[rarity][state]).toContain(message)
    expect(fishingMessage({...game,time:elapsed+stage.duration-.1})).toBe(message)
    expect(fishBehavior(game.time,seed,rarity).mood).toBe('recover')
   }
   elapsed+=stage.duration
  }
 }
 expect(found).toEqual(new Set(['calm','recover']))
})
it('does not consume gameplay randomness or mutate a cast when rendering commentary',()=>{
 const game:TensionGame={...newTensionGame(()=>.5),phase:'playing',time:4}
 const before={...game},random=vi.spyOn(Math,'random').mockImplementation(()=>{throw Error('Gameplay RNG must not be used by text')})
 try{for(let i=0;i<60;i++)expect(fishingMessage(game)).toBe(fishingMessage({...game}));expect(game).toEqual(before)}finally{random.mockRestore()}
})
