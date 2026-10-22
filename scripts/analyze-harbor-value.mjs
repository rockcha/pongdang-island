import {loadEnvFile} from 'node:process'
import {mkdirSync,writeFileSync} from 'node:fs'
import {createClient} from '@supabase/supabase-js'
loadEnvFile('.env.storage.local')
const url=process.env.SUPABASE_URL
if(new URL(url).hostname!=='ewafafphiovbpjwogwzn.supabase.co')throw Error('Wrong project')
const client=createClient(url,process.env.SUPABASE_SECRET_KEY,{auth:{persistSession:false}})
async function all(table){const {data,error}=await client.from(table).select('*');if(error)throw error;return data}
const [vessels,baits,species,regions]=await Promise.all(['harbor_vessels','fishing_baits','collectible_species','regions'].map(all))
// Verified against live expedition_success_chance_bp(...,0) during this analysis.
const success={bait:.35,bait_grubby_magnet:.7,bait_magnet:.7,bait_special:.7,bait_first_greeting:.7}
const grades=['common','rare','epic','mythic'],fallbackWeights={common:7700,rare:2000,epic:270,mythic:30}
function expected(v,region){
 const b=baits.find(b=>b.id===v.catch_bait_id);let mean=0
 for(const grade of grades){
  const probability=b[grade+'_bp']/10000;if(!probability)continue
  let pool=species.filter(s=>b.id==='bait_first_greeting'?['fish','trash','decoration'].includes(s.kind):b.id==='bait_grubby_magnet'?s.kind==='trash':b.effect_kind==='decoration'?s.kind==='decoration'&&s.rarity===grade:['fish','trash'].includes(s.kind)&&s.rarity===grade)
  const matching=pool.filter(s=>s.rarity===grade),fallback=!matching.length
  if(matching.length)pool=matching
  if(!pool.length)throw Error('Empty pool '+v.id+'/'+grade)
  const groups=new Map()
  for(const s of pool){const key=!s.is_native?'shared':s.native_region_id===region.id?'home':'away';if(!groups.has(key))groups.set(key,[]);groups.get(key).push(s)}
  const weights={shared:60,home:35*(v.native_bonus?1.5:1),away:5}
  const total=[...groups.keys()].reduce((sum,k)=>sum+weights[k],0)
  for(const [key,items] of groups){const denom=items.reduce((sum,s)=>sum+(fallback&&b.effect_kind!=='decoration'?fallbackWeights[s.rarity]:1),0);for(const s of items)mean+=probability*weights[key]/total*(fallback&&b.effect_kind!=='decoration'?fallbackWeights[s.rarity]:1)/denom*s.sell_price}
 }
 return mean*success[b.id]
}
const rows=[]
for(const region of regions){
 const raft=vessels.find(v=>v.id==='fishing-raft'),raftHourly=expected(raft,region)*raft.fishing_count*60/raft.duration_minutes
 for(const v of vessels){const attempts=(v.fishing_count+(v.fishing_count_max??v.fishing_count))/2,gross=expected(v,region)*attempts,net=gross-v.fuel_cost*60,hourly=net*60/v.duration_minutes,raftEquivalent=raftHourly*v.duration_minutes/60
 rows.push({region:region.name,regionId:region.id,id:v.id,name:v.name,price:v.price,minutes:v.duration_minutes,fuel:v.fuel_cost,attempts,success:success[v.catch_bait_id],gross,net,hourly,netPerFuel:v.fuel_cost?net/v.fuel_cost:null,breakEvenVoyages:net>0?v.price/net:null,raftEquivalent,extraVsRaft:net-raftEquivalent})}
}
const summaries=vessels.map(v=>{const r=rows.filter(r=>r.id===v.id),mean=k=>r.reduce((s,x)=>s+x[k],0)/r.length;return {...r[0],region:undefined,regionId:undefined,gross:mean('gross'),net:mean('net'),hourly:mean('hourly'),raftEquivalent:mean('raftEquivalent'),extraVsRaft:mean('extraVsRaft'),netPerFuel:v.fuel_cost?mean('net')/v.fuel_cost:null,minNet:Math.min(...r.map(x=>x.net)),maxNet:Math.max(...r.map(x=>x.net)),breakEvenVoyages:mean('net')>0?v.price/mean('net'):null}}).sort((a,b)=>b.net-a.net)
const root='artifacts/harbor-value-20261022';mkdirSync(root,{recursive:true})
writeFileSync(root+'/analysis.json',JSON.stringify({project:new URL(url).hostname,capturedAt:new Date().toISOString(),assumptions:['Live catalog; exact expected sale value, no Monte Carlo','All regions equally weighted; complete sale at catalog price','Fuel cost 60; no bait item cost; capital excluded from voyage net','Conch explorer assumes no discoveries yet; value changes as collection fills','Raft comparator allows fractional continuous trips; discrete collection schedules differ'],vessels,baits,rows,summaries},null,2))
for(const r of summaries)console.log(JSON.stringify(Object.fromEntries(Object.entries(r).map(([k,v])=>[k,typeof v==='number'?Math.round(v*100)/100:v]))))
