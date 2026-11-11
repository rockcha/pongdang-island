import {expect,it} from 'vitest'
import {createPetPreview,petPreviewReducer,petJobRunKey,restorePetPreview,type PetPreviewAction,type PetPreviewState} from '@/features/pets/pet-preview-model'
const now=1800000000000
const run=(s:PetPreviewState,a:Record<string,unknown>,at=now)=>petPreviewReducer(s,{...a,now:at} as PetPreviewAction)
const start=(s=createPetPreview(now),at=now)=>run(s,{type:'start-job',jobId:'sand-golem-clay',roll:.5},at)
it('cancels without any reward, refund or restored needs and immediately permits a new dispatch',()=>{
 let s=start(),p=s.pets[0],key=petJobRunKey(p.job!),gold=s.gold,food=s.food
 s=run(s,{type:'cancel-job',id:p.id,runKey:key},now+600000)
 expect(s.pets[0]).toMatchObject({job:null,fullness:99,affection:99})
 expect(s.gold).toBe(gold);expect(s.food).toBe(food)
 expect(run(s,{type:'claim-job',id:p.id},now+7200000).gold).toBe(gold)
 s=start(s,now+600000)
 expect(s.pets[0].job).not.toBeNull()
 expect(petJobRunKey(s.pets[0].job!)).not.toBe(key)
})
it('does not let a stale or repeated cancellation cancel the next run even at the same timestamp',()=>{
 let s=start(),id=s.activeId!,key=petJobRunKey(s.pets[0].job!)
 const cancel={type:'cancel-job',id,runKey:key}
 s=run(s,cancel);const cancelled=s
 expect(run(s,cancel).pets).toEqual(s.pets)
 s=start(cancelled)
 expect(run(s,cancel).pets).toEqual(s.pets)
})
it('protects finished rewards when the job completes during a confirmation',()=>{
 const s=start(),p=s.pets[0],key=petJobRunKey(p.job!),end=p.job!.endsAt
 const kept=run(s,{type:'cancel-job',id:p.id,runKey:key},end)
 expect(kept.pets[0].job).toEqual(p.job)
 expect(run(kept,{type:'claim-job',id:p.id},end).gold).toBe(s.gold+p.job!.reward)
})
it('continues to enforce departure needs after cancelling and supports previous saved receipts',()=>{
 let s=start(),p=s.pets[0]
 delete p.job!.runId
 s=restorePetPreview(JSON.stringify(s),now+3600000)
 s=run(s,{type:'cancel-job',id:p.id,runKey:petJobRunKey(s.pets[0].job!)},now+3600000)
 s=run(s,{type:'set-needs',fullness:79,affection:100},now+3600000)
 expect(start(s,now+3600000).pets[0].job).toBeNull()
})
