import {loadEnvFile} from 'node:process'
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs'
import {createClient} from '@supabase/supabase-js'
import {createLocalDatabase,replayMigrations} from './db/local.mjs'

// Remote access is SELECT-only. All mutations and random draws use isolated PGlite.
loadEnvFile('.env.storage.local')
const url=process.env.SUPABASE_URL
if(new URL(url).hostname!=='ewafafphiovbpjwogwzn.supabase.co')throw Error('Unexpected project')
const client=createClient(url,process.env.SUPABASE_SECRET_KEY,{auth:{persistSession:false}})
const proposed=process.argv.includes('--proposed')
const output='artifacts/bait-efficiency-20261022'+(proposed?'-proposed':'')
mkdirSync(output,{recursive:true})
async function readAll(table){
 const rows=[]
 for(let offset=0;;offset+=1000){
  const {data,error}=await client.from(table).select('*').order('id').range(offset,offset+999)
  if(error)throw error
  rows.push(...data)
  if(data.length<1000)return rows
 }
}
const [regions,baits,species]=await Promise.all(['regions','fishing_baits','collectible_species'].map(readAll))
if(proposed)for(const bait of baits){
 if(bait.id==='bait_grubby_magnet')bait.price=12
 if(bait.id==='bait_firefly_pupa'){bait.common_bp=9200;bait.epic_bp=800}
 if(bait.id==='bait_shell_crumbs'){bait.common_bp=8200;bait.rare_bp=1800}
 if(bait.id==='bait_halfmoon_honey')bait.success_chance_bp=7500
}
const capturedAt=new Date().toISOString()
writeFileSync(output+'/catalog.json',JSON.stringify({project:new URL(url).hostname,capturedAt,regions,baits,species},null,2))
const schema=JSON.parse(readFileSync('docs/db/local-schema.json','utf8')).structure
const db=await createLocalDatabase()
const uid='00000000-0000-0000-0000-000000009901'
try{
 await replayMigrations(db)
 // Import a read-only catalog snapshot without firing application habitat triggers.
 // No remote write client is used anywhere in this script.
 await db.exec("set session_replication_role='replica'")
 // This database is in-memory only; remove seed species absent from the live catalog.
 await db.exec('truncate public.collectible_species cascade')
 for(const [table,rows] of [['regions',regions],['fishing_baits',baits],['collectible_species',species]]){
  const allowed=new Set(schema.columns.filter(c=>c.schema==='public'&&c.table===table&&c.name!=='is_native').map(c=>c.name))
  for(const row of rows){
   const keys=Object.keys(row).filter(k=>allowed.has(k))
   await db.query(`insert into public.${table}(${keys.join(',')}) values(${keys.map((_,i)=>'$'+(i+1)).join(',')}) on conflict(id) do update set ${keys.filter(k=>k!=='id').map(k=>`${k}=excluded.${k}`).join(',')}`,keys.map(k=>row[k]))
  }
 }
 await db.exec("set session_replication_role='origin'")
 await db.query('insert into auth.users(id,raw_user_meta_data) values($1,$2)',[uid,{game_nickname:'미끼분석전용'}])
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[uid])
 await db.exec('select public.sync_player_profile();select setseed(0.221050)')
 await db.exec(`create function pg_temp.draw_bait(region text,bait text) returns text language plpgsql volatile as $$
 declare b public.fishing_baits;grade public.game_rarity;sid text;
 begin
  select * into b from public.fishing_baits where id=bait;
  grade:=case when b.alternating then app_private.consume_bait_cycle() else 'common'::public.game_rarity end;
  if random()>=app_private.manual_fishing_success_chance_bp(bait)::numeric/10000 then return null;end if;
  if not b.alternating then grade:=app_private.resolve_regional_fishing(bait,region,floor(random()*10000)::int);end if;
  if bait in ('bait_snowflake_salt','bait_shooting_star_tail') then sid:=app_private.pick_balanced_bait_collectible(region,grade,bait,false,true);
  elsif b.fish_only then sid:=app_private.pick_bait_fish(region,grade,false,true);
  elsif bait in ('bait_grubby_magnet','bait_sea_memory','bait_first_greeting') then sid:=app_private.pick_special_bait_collectible(region,grade,bait);
  else select species_id into sid from app_private.pick_regional_collectible(region,grade,b.effect_kind='decoration',floor(random()*10000)::int);end if;
  if sid is null then raise exception 'EMPTY_SIMULATION_POOL';end if;
  if bait='bait_first_greeting' then insert into public.player_discoveries(user_id,species_id) values(auth.uid(),sid) on conflict do nothing;end if;
  return sid;
 end $$`)
 const rarities=['common','rare','epic','mythic']
 const fallbackWeights={common:7700,rare:2000,epic:270,mythic:30}
 function expectedCatch(bait,region,grade){
  let pool
  let fallback=false
  if(bait.id==='bait_snowflake_salt')pool=species.filter(s=>!s.is_native&&['fish','trash'].includes(s.kind)&&s.rarity===grade)
  else if(bait.id==='bait_shooting_star_tail')pool=species.filter(s=>s.rarity===grade&&(grade==='mythic'?['fish','trash','decoration'].includes(s.kind):s.kind==='trash'))
  else if(bait.fish_only)pool=species.filter(s=>s.kind==='fish'&&s.rarity===grade)
  else if(['bait_grubby_magnet','bait_sea_memory','bait_first_greeting'].includes(bait.id)){
   pool=species.filter(s=>bait.id==='bait_grubby_magnet'?s.kind==='trash':bait.id==='bait_first_greeting'?['fish','trash','decoration'].includes(s.kind):['fish','trash'].includes(s.kind))
   const matching=pool.filter(s=>s.rarity===grade)
   if(matching.length)pool=matching;else fallback=true
  }else pool=species.filter(s=>s.rarity===grade&&(bait.effect_kind==='decoration'?s.kind==='decoration':['fish','trash'].includes(s.kind)))
  const groups=new Map()
  for(const s of pool){const bucket=!s.is_native?'shared':s.native_region_id===region.id?'home':'away';if(!groups.has(bucket))groups.set(bucket,[]);groups.get(bucket).push(s)}
  const weights={home:25*(bait.id==='bait_sea_memory'?3:1),shared:80,away:5}
  const total=[...groups.keys()].reduce((a,k)=>a+weights[k],0)
  if(!total)throw Error(`Empty theoretical pool ${bait.id}/${region.id}/${grade}`)
  let mean=0,second=0
  for(const [key,items] of groups){
   const divisor=items.reduce((a,s)=>a+(fallback?fallbackWeights[s.rarity]:1),0)
   for(const s of items){const p=weights[key]/total*(fallback?fallbackWeights[s.rarity]:1)/divisor;mean+=p*s.sell_price;second+=p*s.sell_price*s.sell_price}
  }
  return {mean,second}
 }
 const results=[]
 for(const region of regions){
  for(const bait of baits){
   await db.exec('delete from app_private.bait_cycles;delete from public.player_discoveries')
   const chance=(await db.query('select app_private.manual_fishing_success_chance_bp($1) n',[bait.id])).rows[0].n/10000
   const odds=bait.alternating?[.5,.5,0,0]:rarities.map(r=>bait[r+'_bp']/10000)
   let mean=0,second=0
   for(const [i,grade] of rarities.entries())if(odds[i]){const value=expectedCatch(bait,region,grade);mean+=chance*odds[i]*value.mean;second+=chance*odds[i]*value.second}
   const draws=(await db.query(`with draws as materialized(select n,pg_temp.draw_bait($1,$2) id from generate_series(1,50)n)
    select d.n,d.id,s.name,s.kind,s.rarity,coalesce(s.sell_price,0) gold from draws d left join public.collectible_species s on s.id=d.id order by n`,[region.id,bait.id])).rows
   const gross=draws.reduce((a,d)=>a+d.gold,0),cost=bait.price===null?null:bait.price*50
   const row={regionId:region.id,region:region.name,baitId:bait.id,bait:bait.name,price:bait.price,attempts:50,successChance:chance,caught:draws.filter(d=>d.id).length,fish:draws.filter(d=>d.kind==='fish').length,trash:draws.filter(d=>d.kind==='trash').length,decorations:draws.filter(d=>d.kind==='decoration').length,mythic:draws.filter(d=>d.rarity==='mythic').length,cost,gross,profit:cost===null?null:gross-cost,returnPct:cost?gross/cost*100:null,expectedGross:mean*50,expectedProfit:cost===null?null:mean*50-cost,expectedReturnPct:cost?mean*50/cost*100:null,expectedSd:Math.sqrt(Math.max(0,second-mean*mean)*50),draws}
   results.push(row)
  }
  console.log('Completed '+region.name)
 }
 const report={capturedAt,project:new URL(url).hostname,source:'Live catalog SELECT; local latest PostgreSQL fishing helpers. Remote function definitions unverified.',assumptions:['50 bait uses per region/bait, failures included','Basic rod; every minigame succeeds; no time valuation','All catches sold at base sell_price, including trash and decorations','All regions accessible; discoveries reset before each combination','First-greeting theoretical value is initial empty-collection value; its 50 actual draws update discoveries','Alternating bait begins common and alternates even after failure','No transaction fees, map purchase, rod cost, title rewards, merchant bonus or event rewards'],seed:0.221050,results}
 report.proposedOverrides=proposed
 writeFileSync(output+'/results.json',JSON.stringify(report,null,2))
 const fields=['region','bait','price','attempts','caught','fish','trash','decorations','mythic','cost','gross','profit','returnPct','expectedGross','expectedProfit','expectedReturnPct','expectedSd']
 writeFileSync(output+'/results.csv','\uFEFF'+fields.join(',')+'\n'+results.map(r=>fields.map(k=>JSON.stringify(r[k]??'')).join(',')).join('\n'))
 const summary=regions.map(region=>({region:region.name,top:results.filter(r=>r.regionId===region.id&&r.cost).sort((a,b)=>b.expectedReturnPct-a.expectedReturnPct).slice(0,3).map(({bait,cost,gross,profit,returnPct,expectedProfit,expectedReturnPct})=>({bait,cost,gross,profit,returnPct,expectedProfit,expectedReturnPct}))}))
 writeFileSync(output+'/summary.json',JSON.stringify(summary,null,2))
 console.log(JSON.stringify({regions:regions.length,baits:baits.length,attempts:results.length*50,summary},null,2))
}finally{await db.close()}
