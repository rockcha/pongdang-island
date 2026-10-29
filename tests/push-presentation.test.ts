// @vitest-environment node
import {expect,it} from 'vitest'
import {groupPushDeliveries,presentPush,type PushDelivery} from '../supabase/functions/_shared/push-presentation'
const delivery=(id:number,userId='owner',endpoint='https://fcm.googleapis.com/test',category='production'):PushDelivery=>({id,leaseToken:'lease-'+id,payload:{userId,category,tag:'notice:'+id,title:'준비 완료',body:'실제 생산 수량 12개',quantity:12,url:'/production'},subscription:{endpoint,keys:{p256dh:'p',auth:'a'}}})
it('groups only the same account, subscription and category and retains every lease',()=>{
 const groups=groupPushDeliveries([delivery(1),delivery(2),delivery(3,'other'),delivery(4,'owner','https://fcm.googleapis.com/other'),delivery(5,'owner',undefined,'harbor')])
 expect(groups).toHaveLength(4)
 expect(groups[0].deliveries.map(d=>d.leaseToken)).toEqual(['lease-1','lease-2'])
 expect(groups[0].payload.title).toBe('🔥 따끈한 연료가 준비됐어요')
 expect(groups[0].payload.body).toContain('2곳 · 연료 24개')
 expect(groups[0].payload).not.toHaveProperty('subscription')
})
it('does not invent quantities and deduplicates notification identities',()=>{
 const payload=delivery(1).payload
 const one={tag:'a',title:'준비',body:'실제 문구'},two={...one,tag:'b'}
 expect(presentPush(payload,[one,one,two]).body).toBe('생산소 2곳에서 준비를 마쳤어요. 한 번에 챙겨가세요.')
 expect(presentPush(payload,[one]).body).toBe('실제 문구')
})
it('splits oversized batches without losing leases',()=>{
 const deliveries=Array.from({length:20},(_,i)=>({...delivery(i),payload:{...delivery(i).payload,body:'가'.repeat(200)}}))
 const groups=groupPushDeliveries(deliveries)
 expect(groups.length).toBeGreaterThan(1)
 expect(groups.flatMap(g=>g.deliveries).map(d=>d.id)).toEqual(deliveries.map(d=>d.id))
 for(const group of groups)expect(new TextEncoder().encode(JSON.stringify(group.payload)).length).toBeLessThanOrEqual(3500)
})
