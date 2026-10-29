// Shared by the sender, app cards, and generated classic service-worker helper.
export type PushMember={tag:string;title:string;body:string;quantity?:number|null;expiresAt?:string|null}
export type PushPayload=PushMember&{userId:string;category?:string;url:string;members?:PushMember[]}
export const pushTitles:Record<string,string>={production:'🔥 따끈한 연료가 준비됐어요','bait-production':'🪱 미끼 도시락 완성!',expedition:'🐟 통발에 손님이 왔어요!',harbor:'⛵ 배가 돌아왔어요!','production-expiring':'⏳ 연료가 기다리고 있어요','bait-production-expiring':'⏳ 미끼가 기다리고 있어요',test:'💌 퐁이가 소식을 가져왔어요'}
export const groupedCategories=['production','bait-production','expedition','harbor','production-expiring','bait-production-expiring']
export function membersOf(payload:PushPayload):PushMember[]{return payload.members?.length?payload.members:[{tag:payload.tag,title:payload.title,body:payload.body,quantity:payload.quantity,expiresAt:payload.expiresAt}]}
export function presentPush(payload:PushPayload,members=membersOf(payload)):PushPayload{
 const unique=[...new Map(members.map(m=>[m.tag,m])).values()]
 const category=payload.category??''
 const title=pushTitles[category]??payload.title
 const count=unique.length
 const quantity=unique.every(m=>Number.isFinite(m.quantity)&&Number(m.quantity)>=0)?unique.reduce((sum,m)=>sum+Number(m.quantity),0):null
 let body=unique[0]?.body??payload.body
 if(count>1){
  if(category==='production'||category==='bait-production')body=quantity!=null?`생산소 ${count}곳 · ${category==='production'?'연료':'미끼'} ${quantity.toLocaleString('ko-KR')}개가 준비됐어요. 한 번에 챙겨가세요.`:`생산소 ${count}곳에서 준비를 마쳤어요. 한 번에 챙겨가세요.`
  else if(category==='expedition')body=`통발 ${count}개에서 수확을 기다리고 있어요. 어떤 친구가 왔는지 확인해 보세요.`
  else if(category==='harbor')body=`어선 ${count}척이 돌아왔어요. 항구에서 선물을 확인해요.`
  else body=`생산소 ${count}곳의 보관 시간이 얼마 남지 않았어요. 만료 전에 챙겨주세요.`
 }
 const expires=unique.map(m=>m.expiresAt).filter((s):s is string=>!!s&&Number.isFinite(Date.parse(s)))
 return {...payload,title,body,members:unique,quantity,expiresAt:expires.length?new Date(Math.min(...expires.map(Date.parse))).toISOString():undefined}
}
export type PushDelivery={id:number;leaseToken:string;payload:PushPayload;subscription:{endpoint:string;keys:{p256dh:string;auth:string}}}
export function groupPushDeliveries(deliveries:PushDelivery[]){
 const groups=new Map<string,{deliveries:PushDelivery[];payload:PushPayload;subscription:PushDelivery['subscription']}>()
 const result:{deliveries:PushDelivery[];payload:PushPayload;subscription:PushDelivery['subscription']}[]=[]
 for(const delivery of deliveries){
  const p=delivery.payload,c=p.category??''
  const key=JSON.stringify([delivery.subscription.endpoint,p.userId,groupedCategories.includes(c)?c:delivery.id])
  const group=groups.get(key)
  const combined=group?presentPush(group.payload,[...membersOf(group.payload),...membersOf(p)]):null
  if(group&&combined&&new TextEncoder().encode(JSON.stringify(combined)).length<=3500){group.deliveries.push(delivery);group.payload=combined}
  else{const next={deliveries:[delivery],payload:presentPush({...p,tag:groupedCategories.includes(c)?`pongdang:${p.userId}:${c}:${delivery.id}`:p.tag}),subscription:delivery.subscription};groups.set(key,next);result.push(next)}
 }
 return result
}
