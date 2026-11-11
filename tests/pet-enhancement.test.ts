import { expect,it } from 'vitest'
import {createPetPreview,petPreviewReducer,restorePetPreview,type PetPreviewState,type PetPreviewAction} from '@/features/pets/pet-preview-model'
import {petJobs,petSpecies,petJobRewards,PET_MAX_LEVEL} from '@/features/pets/pet-catalog'
const now=1_800_000_000_000
const run=(s:PetPreviewState,a:Record<string,unknown>,at=now)=>petPreviewReducer(s,{...a,now:at} as PetPreviewAction)
function pair(){const initial=createPetPreview(now);const s=run(initial,{type:'add-pet',speciesId:initial.pets[0].speciesId});return {s,target:s.pets[0].id,material:s.pets.at(-1)!.id}}
it('enhances by original species despite renames, consumes exactly one and preserves target needs and wallet',()=>{
  let {s,target,material}=pair()
  s=run(s,{type:'rename',id:target,name:'퐁당고양이'})
  s=run(s,{type:'set-needs',fullness:20,affection:40})
  const before=s
  const command={type:'enhance',targetId:target,materialId:material,expectedLevel:0}
  s=run(s,command)
  expect(s.pets).toHaveLength(before.pets.length-1)
  expect(s.pets[0]).toMatchObject({id:target,name:'퐁당고양이',level:1,fullness:20,affection:40})
  expect(s.gold).toBe(before.gold);expect(s.food).toBe(before.food)
  expect(run(s,command).pets).toEqual(s.pets)
})
it('rejects self, wrong species, enhanced materials and stale level confirmations',()=>{
  const {s,target,material}=pair()
  for(const id of [target,s.pets[1].id])expect(run(s,{type:'enhance',targetId:target,materialId:id,expectedLevel:0}).pets).toEqual(s.pets)
  expect(run(s,{type:'enhance',targetId:target,materialId:material,expectedLevel:1}).pets).toEqual(s.pets)
  s.pets.at(-1)!.level=1
  expect(run(s,{type:'enhance',targetId:target,materialId:material,expectedLevel:0}).pets).toEqual(s.pets)
})
it('blocks enhancement during care and while either pet has an unclaimed job',()=>{
  const {s,target,material}=pair(),command={type:'enhance',targetId:target,materialId:material,expectedLevel:0}
  const care=run(s,{type:'care',action:'stroke',id:'care'})
  expect(run(care,command).pets).toEqual(care.pets)
  const working=run(s,{type:'start-job',jobId:'sand-golem-clay',roll:0})
  expect(run(working,command).pets).toEqual(working.pets)
  const completed=run(working,command,now+3600000)
  expect(completed.pets[0].level).toBe(0)
  s.pets.at(-1)!.job=working.pets[0].job
  expect(run(s,command).pets).toEqual(s.pets)
})
it('caps at +5 and safely replaces a displayed material with the retained target',()=>{
  let {s,target,material}=pair()
  s=run(s,{type:'select',id:material})
  s=run(s,{type:'enhance',targetId:target,materialId:material,expectedLevel:0})
  expect(s.activeId).toBe(target)
  for(let level=1;level<PET_MAX_LEVEL;level++){
    s=run(s,{type:'add-pet',speciesId:s.pets[0].speciesId})
    s=run(s,{type:'enhance',targetId:target,materialId:s.pets.at(-1)!.id,expectedLevel:level})
  }
  expect(s.pets[0].level).toBe(5)
  s=run(s,{type:'add-pet',speciesId:s.pets[0].speciesId})
  expect(run(s,{type:'enhance',targetId:target,materialId:s.pets.at(-1)!.id,expectedLevel:5}).pets).toEqual(s.pets)
})
it.each([0,1,2,3,4,5])('allows exactly two species jobs at +%s with a linear reward bonus and fixed duration',level=>{
  for(const species of petSpecies) expect(petJobs.filter(j=>j.speciesId===species.id)).toHaveLength(2)
  for(const job of petJobs){
    const s=createPetPreview(now),pet=s.pets.find(p=>p.speciesId===job.speciesId)!
    pet.level=level;s.activeId=pet.id
    const sent=run(s,{type:'start-job',jobId:job.id,roll:0})
    const range=petJobRewards(job,level)
    expect(sent.pets.find(p=>p.id===pet.id)!.job).toMatchObject({endsAt:now+job.minutes*60000,reward:range.min,minReward:range.min,maxReward:range.max})
    if(job.speciesId!==s.pets[0].speciesId){s.activeId=s.pets[0].id;expect(run(s,{type:'start-job',jobId:job.id,roll:0}).pets.every(p=>!p.job)).toBe(true)}
  }
})
it('restores old saves at +0 while keeping previously dispatched rewards and deadlines',()=>{
  const legacy=JSON.parse(JSON.stringify(createPetPreview(now)))
  for(const p of legacy.pets)delete p.level
  legacy.pets[0].job={id:'lighthouse',startedAt:now,endsAt:now+10*3600000,reward:875}
  const restored=restorePetPreview(JSON.stringify(legacy),now)
  expect(restored.pets.every(p=>p.level===0)).toBe(true)
  expect(restored.pets[0].job).toEqual(legacy.pets[0].job)
  expect(run(restored,{type:'claim-job',id:restored.activeId},now+10*3600000).gold).toBe(10875)
})
