import {loadEnvFile} from 'node:process'
import {readFileSync} from 'node:fs'
import {createClient} from '@supabase/supabase-js'

loadEnvFile('.env.storage.local')
const url=process.env.SUPABASE_URL
if(new URL(url).hostname!=='ewafafphiovbpjwogwzn.supabase.co')throw Error('Unexpected project')
const client=createClient(url,process.env.SUPABASE_SECRET_KEY,{auth:{persistSession:false}})
const changes={
 bait_grubby_magnet:{before:{price:10},after:{price:12}},
 bait_firefly_pupa:{before:{common_bp:9000,epic_bp:1000},after:{common_bp:9200,epic_bp:800}},
 bait_shell_crumbs:{before:{common_bp:8000,rare_bp:2000},after:{common_bp:8200,rare_bp:1800}},
 bait_halfmoon_honey:{before:{success_chance_bp:8000},after:{success_chance_bp:7500}},
}
const ids=Object.keys(changes)
const catalog=JSON.parse(readFileSync('supabase/catalog/catalog.json','utf8')).fishing_baits
async function read(){
 const {data,error}=await client.from('fishing_baits').select('*').in('id',ids).order('id')
 if(error)throw error
 if(data.length!==4)throw Error('Missing target bait; refusing to insert new rows')
 return data
}
const rows=await read()
const updates=rows.map(row=>{
 const {before,after}=changes[row.id]
 const source=catalog.find(b=>b.id===row.id)
 for(const [key,value] of Object.entries(after)){
  if(source[key]!==value)throw Error('Catalog mismatch: '+row.id+'/'+key)
  if(row[key]!==before[key]&&row[key]!==value)throw Error('Remote drift: '+row.id+'/'+key)
 }
 return {...row,...after,...(row.id==='bait_firefly_pupa'||row.id==='bait_shell_crumbs'?{effect_description:source.effect_description}:{})}
})
const view=row=>({id:row.id,name:row.name,price:row.price,common_bp:row.common_bp,rare_bp:row.rare_bp,epic_bp:row.epic_bp,success_chance_bp:row.success_chance_bp,effect_description:row.effect_description})
console.log(JSON.stringify({project:new URL(url).hostname,before:rows.map(view),planned:updates.map(view)},null,2))
if(process.argv.includes('--apply')){
 // One PostgREST request commits all four row updates atomically. Retain every
 // unrelated live column, including image paths, rather than replacing from local.
 const {error}=await client.from('fishing_baits').upsert(updates,{onConflict:'id'})
 if(error)throw error
 const verified=await read()
 for(const row of verified){
  const expected=updates.find(r=>r.id===row.id)
  for(const key of [...Object.keys(changes[row.id].after),'effect_description'])if(row[key]!==expected[key])throw Error('Read-back mismatch: '+row.id+'/'+key)
 }
 console.log(JSON.stringify({status:'APPLIED_AND_VERIFIED',verifiedAt:new Date().toISOString(),rows:verified.map(view),migrationHistory:'Not modified; applied as catalog DML through REST.'},null,2))
}
