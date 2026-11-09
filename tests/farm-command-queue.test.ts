import {expect,it,vi} from 'vitest'
import {FarmCommandQueue} from '@/features/farm/command-queue'
import type {FarmCommand} from '@/features/farm/account-engine'

const plant=(id:number):FarmCommand=>({type:'simulate',id,action:{type:'plant',crop:'wheat'}})
const harvest=(id:number):FarmCommand=>({type:'simulate',id,action:{type:'beginHarvest'}})
const flush=async()=>{await Promise.resolve();await Promise.resolve()}

it('groups adjacent planting gestures and shares pending double taps without changing a sent request',async()=>{
 let resolve!:(value:number)=>void
 const send=vi.fn((_command:FarmCommand)=>new Promise<number>(done=>{resolve=done}))
 const queue=new FarmCommandQueue(send,()=>true)
 const first=queue.enqueue(plant(1)),second=queue.enqueue(plant(2))
 expect(queue.enqueue(plant(1))).toBe(first)
 await flush()
 expect(send).toHaveBeenCalledExactlyOnceWith({type:'batch',commands:[plant(1),plant(2)]})
 const third=queue.enqueue(plant(3)),fourth=queue.enqueue(plant(4))
 expect(send).toHaveBeenCalledTimes(1)
 resolve(1);await flush()
 expect(await first).toBe(1);expect(await second).toBe(1)
 expect(send.mock.calls[1][0]).toEqual({type:'batch',commands:[plant(3),plant(4)]})
 resolve(2);expect(await third).toBe(2);expect(await fourth).toBe(2)
})

it('keeps unrelated commands in order and respects the server batch limit',async()=>{
 const send=vi.fn(async(_command:FarmCommand)=>1),queue=new FarmCommandQueue(send,()=>true)
 const promises=Array.from({length:101},(_,id)=>queue.enqueue(harvest(id)))
 promises.push(queue.enqueue({type:'buyLand',quantity:1}),queue.enqueue(harvest(102)))
 await Promise.all(promises)
 expect(send.mock.calls.map(([command])=>command.type)).toEqual(['batch','simulate','buyLand','simulate'])
 expect((send.mock.calls[0][0] as {commands:FarmCommand[]}).commands).toHaveLength(100)
})

it('cancels dependent intentions after a failed write rather than replaying them',async()=>{
 let resolve!:(value:null)=>void
 const send=vi.fn((_command:FarmCommand)=>new Promise<null>(done=>{resolve=done})),queue=new FarmCommandQueue(send,()=>true)
 const first=queue.enqueue({type:'buyLand',quantity:1}),next=queue.enqueue(plant(1))
 resolve(null)
 expect(await first).toBeNull();expect(await next).toBeNull();expect(send).toHaveBeenCalledTimes(1)
})

it('drops queued and late results after account scope changes, including returning to the same owner',async()=>{
 let generation=1,resolve!:(value:number)=>void
 const started=generation,send=vi.fn((_command:FarmCommand)=>new Promise<number>(done=>{resolve=done}))
 const queue=new FarmCommandQueue(send,()=>generation===started)
 const first=queue.enqueue({type:'buyLand',quantity:1}),next=queue.enqueue(plant(1))
 generation=3;resolve(1)
 expect(await first).toBeNull();expect(await next).toBeNull();expect(send).toHaveBeenCalledTimes(1)
 expect(await queue.enqueue(plant(2))).toBeNull()
})
