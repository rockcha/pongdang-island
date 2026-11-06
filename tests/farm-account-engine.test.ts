import {expect,it} from 'vitest'
import {applyFarmCommand,initialAccountFarm,validFarmState,type FarmCommand} from '@/features/farm/account-engine'

it('initializes no practice gold and preserves starter gifts without granting repeat funds',()=>{
 const state=initialAccountFarm()
 expect(state.gold).toBe(0);expect(validFarmState(state)).toBe(true)
 expect(applyFarmCommand(state,{type:'buy',kind:'mill',quantity:1},0)).toBe(state)
})
it('charges a purchase once, requires owned stock for placement, and restores only the paid resale value',()=>{
 let s={...initialAccountFarm(),gold:10000}
 expect(applyFarmCommand(s,{type:'place',kind:'mill',x:8,y:6,transform:{}},0)).toBe(s)
 s=applyFarmCommand(s,{type:'buy',kind:'mill',quantity:1},0)
 expect(s.gold).toBe(8000)
 s=applyFarmCommand(s,{type:'place',kind:'mill',x:8,y:6,transform:{}},0)
 const id=s.objects.at(-1)!.id
 expect(s.stored).not.toContain('mill');expect(s.objects.at(-1)?.constructionReadyAt).toBe(10000)
 expect(applyFarmCommand(s,{type:'resell',id},9999)).toBe(s)
 s=applyFarmCommand(s,{type:'tick'},10000)
 s=applyFarmCommand(s,{type:'resell',id},10000)
 expect(s.gold).toBe(9000);expect(applyFarmCommand(s,{type:'resell',id},10001)).toBe(s)
})
it('rejects injected placement ownership, levels and construction deadlines',()=>{
 let s={...initialAccountFarm(),gold:10000};s=applyFarmCommand(s,{type:'buy',kind:'mill',quantity:1},0)
 for(const patch of [{kind:'advancedKitchen'},{id:28},{level:10},{constructionReadyAt:0}])expect(()=>applyFarmCommand(s,{type:'place',kind:'mill',x:8,y:6,transform:patch} as unknown as FarmCommand,0)).toThrow()
 expect(s.gold).toBe(8000);expect(s.stored).toEqual(['mill'])
})
it('keeps multi-action operations atomic and rejects invalid quantities or nested command batches',()=>{
 const s={...initialAccountFarm(),gold:10000}
 expect(()=>applyFarmCommand(s,{type:'batch',commands:[{type:'buy',kind:'mill',quantity:1},{type:'place',kind:'mill',x:-1,y:0,transform:{}}]},0)).toThrow()
 expect(s.gold).toBe(10000);expect(s.stored).toEqual([])
 expect(()=>applyFarmCommand(s,{type:'batch',commands:[{type:'batch',commands:[]}]},0)).toThrow()
 expect(()=>applyFarmCommand(s,{type:'simulate',id:23,action:{type:'seed',good:'wheatSeed',quantity:1.5}},0)).toThrow()
})
it('uses the server execution time, consumes ingredients once and rejects premature production collection',()=>{
 const s=initialAccountFarm(),kitchen=s.objects.find(o=>o.kind==='kitchen')!
 const next=applyFarmCommand(s,{type:'simulate',id:kitchen.id,action:{type:'craft',recipe:'wholeWheatPorridge',quantity:2}},1000)
 expect(next.simulation.inventory.wheat).toBe(6)
 expect(next.simulation.processingJobs[kitchen.id].readyAt).toBe(601000)
 expect(()=>applyFarmCommand(next,{type:'simulate',id:kitchen.id,action:{type:'collectCraft'}},600999)).toThrow()
 const done=applyFarmCommand(next,{type:'simulate',id:kitchen.id,action:{type:'collectCraft'}},601000)
 expect(done.simulation.inventory.wholeWheatPorridge).toBe(2)
 expect(()=>applyFarmCommand(done,{type:'simulate',id:kitchen.id,action:{type:'collectCraft'}},601001)).toThrow()
})
