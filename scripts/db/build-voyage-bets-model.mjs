import fs from 'node:fs'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
const root='artifacts/voyage-bets',snapshot=JSON.parse(fs.readFileSync(root+'/preflight.json','utf8'))
const companies=JSON.parse(fs.readFileSync('supabase/voyage-bets/companies.json','utf8'))
assert.ok(snapshot.functions.filter(f=>['pick_habitat_group','pick_profile_collectible','profile_fishing_rarity','collectible_available_at'].includes(f.name)).every(f=>f.matchesLocal),'Review remote selection rules before rebuilding')
const hash=s=>createHash('sha256').update(s).digest('hex')
function rng(text){let a=createHash('sha256').update(text).digest().readUInt32LE(0);return()=>{a=(a+0x6d2b79f5)>>>0;let t=Math.imul(a^(a>>>15),1|a);t^=t+Math.imul(t^(t>>>7),61|t);return((t^(t>>>14))>>>0)/4294967296}}
const at=Date.parse(snapshot.captured_at),events=snapshot.event_windows??[]
assert.ok(Number.isFinite(at))
const boundaries=[at,...events.flatMap(e=>[Date.parse(e.starts_at),Date.parse(e.ends_at)]).filter(t=>t>at)].sort((a,b)=>a-b)
const periods=boundaries.map((time,i)=>({from:time,until:boundaries[i+1]??null}))
const regions=snapshot.regions.map(r=>r.id),profiles=snapshot.profiles
const allModels=[],allMetrics=[]
function makePool(species,bait,region){
 const outcomes=[]
 for(const rarity of ['common','rare','epic','mythic']){
  const p=bait[rarity+'_bp']/10000;if(!p)continue
  const group={shared:[],home:[],away:[]},weight={shared:80,home:25,away:5}
  for(const s of species.filter(s=>s.rarity===rarity&&bait.target_kinds.includes(s.kind)))group[s.is_native===false?'shared':s.native_region_id===region?'home':'away'].push(s)
  const total=Object.keys(group).reduce((n,k)=>n+(group[k].length?weight[k]:0),0);assert.ok(total)
  for(const[k,rows]of Object.entries(group))for(const s of rows)outcomes.push({price:s.sell_price,p:p*weight[k]/total/rows.length})
 }
 assert.ok(Math.abs(outcomes.reduce((n,o)=>n+o.p,0)-1)<1e-9)
 const map=new Map();for(const o of outcomes)map.set(o.price,(map.get(o.price)??0)+o.p)
 const prices=[],cdf=[];let n=0;for(const[v,p]of [...map].sort((a,b)=>a[0]-b[0])){prices.push(v);cdf.push(n+=p)}cdf[cdf.length-1]=1
 return{prices,cdf,mean:outcomes.reduce((n,o)=>n+o.price*o.p,0)}
}
function draw(pool,random){const r=random();let lo=0,hi=pool.cdf.length-1;while(lo<hi){const mid=(lo+hi)>>>1;if(r<pool.cdf[mid])hi=mid;else lo=mid+1}return pool.prices[lo]}
function regionalBank(pool,n,size,key){const random=rng(key),a=new Int32Array(size);for(let i=0;i<size;i++){let sum=0;for(let j=0;j<n;j++)sum+=draw(pool,random);a[i]=sum}return a}
function mix(banks,publicIndex,size,key){
 const random=rng(key),a=new Int32Array(size),length=banks[0].length
 for(let i=0;i<size;i++){
  let h1=Math.floor(random()*(regions.length-1));if(h1>=publicIndex)h1++
  let h2=Math.floor(random()*(regions.length-2));for(const excluded of [publicIndex,h1].sort((a,b)=>a-b))if(h2>=excluded)h2++
  assert.notEqual(h1,h2);assert.notEqual(h1,publicIndex);assert.notEqual(h2,publicIndex)
  a[i]=banks[publicIndex][Math.floor(random()*length)]+banks[h1][Math.floor(random()*length)]+banks[h2][Math.floor(random()*length)]
 }return a
}
function exactValidation(pools,count,publicIndex,target,size,key){
 const random=rng(key);let above=0,below=0,equal=0,sum=0,sq=0
 for(let i=0;i<size;i++){
  const other=regions.map((_,i)=>i).filter(i=>i!==publicIndex)
  const h1=other.splice(Math.floor(random()*other.length),1)[0],h2=other[Math.floor(random()*other.length)]
  let value=0;for(const index of [publicIndex,h1,h2])for(let j=0;j<count;j++)value+=draw(pools[index],random)
  if(value>target)above++;else if(value<target)below++;else equal++;sum+=value;sq+=value*value
 }
 return{above:above/size,below:below/size,equal:equal/size,mean:sum/size,sd:Math.sqrt(sq/size-(sum/size)**2),samples:size}
}
for(const period of periods){
 const eligible=snapshot.species.filter(s=>!events.some(e=>s.id.startsWith(e.species_prefix)&&(period.from<Date.parse(e.starts_at)||period.from>=Date.parse(e.ends_at))))
 const version=hash(JSON.stringify({companies,species:eligible,profiles,regions,schedule:'09-12/19-22 Asia/Seoul',model:1}))
 const baits={},pools={},targets={},metrics=[],options=[]
 const species=Object.fromEntries(eligible.map(s=>[s.id,{id:s.id,name:s.name,kind:s.kind,rarity:s.rarity,price:s.sell_price,region:s.native_region_id,thumbnailPath:s.thumbnail_path}]))
 for(const company of companies)for(const bid of company.baitIds){
  const bait=profiles.find(b=>b.id===bid);assert.ok(bait&&bait.effect_kind==='standard'&&bait.native_multiplier===1&&bait.price>0)
  baits[bid]={id:bid,name:bait.name,price:bait.price,common:bait.common_bp,rare:bait.rare_bp,epic:bait.epic_bp,mythic:bait.mythic_bp}
  pools[bid]={}
  for(const rarity of ['common','rare','epic','mythic']){
   const rows=eligible.filter(s=>s.rarity===rarity&&bait.target_kinds.includes(s.kind))
   pools[bid][rarity]={shared:rows.filter(s=>s.is_native===false).map(s=>s.id),native:rows.filter(s=>s.is_native!==false).map(s=>s.id),home:Object.fromEntries(regions.map(r=>[r,rows.filter(s=>s.is_native!==false&&s.native_region_id===r).map(s=>s.id)]))}
  }
  const base=Math.max(1,Math.round(company.budgetPerRegion/bait.price)),radius=Math.max(1,Math.round(base*.06))
  const counts=Array.from({length:radius*2+1},(_,i)=>Math.max(1,base-radius+i))
  options.push({companyId:company.id,baitId:bid,base,counts})
  const pricePools=regions.map(r=>makePool(eligible,bait,r))
  for(const count of counts){
   const banks=pricePools.map((pool,i)=>regionalBank(pool,count,16384,version+bid+count+regions[i]+'/bank'))
   for(let i=0;i<regions.length;i++){
    const key=bid+':'+count+':'+regions[i]
    let train=mix(banks,i,65536,version+key+'/mix').sort(),target=train[32768]
    let validation=exactValidation(pricePools,count,i,target,4096,version+key+'/validation')
    if(Math.max(validation.above,validation.below)>.525){
     const bigger=pricePools.map((pool,j)=>regionalBank(pool,count,65536,version+key+regions[j]+'/refined'))
     train=mix(bigger,i,131072,version+key+'/refined-mix').sort();target=train[65536]
     validation=exactValidation(pricePools,count,i,target,16384,version+key+'/refined-validation')
    }
    if(Math.max(validation.above,validation.below)>.53)throw Error('Unbalanced model: '+key+' '+JSON.stringify(validation))
    targets[key]=target;metrics.push({companyId:company.id,baitId:bid,count,publicRegion:regions[i],target,...validation})
   }
  }
  console.log(JSON.stringify({period:new Date(period.from).toISOString(),company:company.id,bait:bid,counts,targets:metrics.length}))
 }
 const model={id:version,validFrom:new Date(period.from).toISOString(),validUntil:period.until?new Date(period.until).toISOString():null,data:{version:1,companies:companies.map(({baitIds,budgetPerRegion,...c})=>c),regions:Object.fromEntries(snapshot.regions.map(r=>[r.id,r.name])),baits,species,pools,options,targets,seedPolicy:'Independent calibration and PostgreSQL random actual catches; target depends only on public region, bait and count',fuelCost:100}}
 allModels.push(model);allMetrics.push({id:version,metrics})
 fs.mkdirSync('supabase/voyage-bets/generated',{recursive:true})
 fs.writeFileSync('supabase/voyage-bets/generated/models.json',JSON.stringify(allModels)+'\n')
 fs.writeFileSync(root+'/three-region-validation.json',JSON.stringify({snapshotAt:snapshot.captured_at,models:allMetrics},null,2)+'\n')
}
console.log(JSON.stringify({models:allModels.length,targets:allMetrics.reduce((n,m)=>n+m.metrics.length,0),validationSamples:allMetrics.flatMap(m=>m.metrics).reduce((n,m)=>n+m.samples,0),bytes:fs.statSync('supabase/voyage-bets/generated/models.json').size}))
