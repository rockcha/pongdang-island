import {loadEnvFile} from 'node:process'
import {writeFileSync} from 'node:fs'
import {createClient} from '@supabase/supabase-js'
loadEnvFile('.env.storage.local')
const client=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}})
function check(r,label){if(r.error)throw new Error(label+': '+(r.error.code??'failed'));return r.data}
const habitats=check(await client.from('collectible_habitats').select('species_id').eq('region_id','primal'),'habitats')
const species=check(await client.from('collectible_species').select('id,name,kind,native_region_id').in('id',habitats.map(h=>h.species_id)),'species')
const excluded=species.filter(s=>s.kind==='fish'&&s.native_region_id!=='primal')
if(excluded.some(s=>s.native_region_id!==null))throw new Error('Unexpected foreign-native habitat; review before deleting')
if(excluded.length)check(await client.from('collectible_habitats').delete().eq('region_id','primal').in('species_id',excluded.map(s=>s.id)),'remove habitats')
const remaining=check(await client.from('collectible_habitats').select('species_id').eq('region_id','primal'),'verify habitats')
const remainingSpecies=check(await client.from('collectible_species').select('id,kind,native_region_id').in('id',remaining.map(h=>h.species_id)),'verify species')
const fish=remainingSpecies.filter(s=>s.kind==='fish')
if(fish.length!==20||fish.some(s=>s.native_region_id!=='primal'))throw new Error('Unexpected remaining fish pool')
writeFileSync('artifacts/primal-exclusive-remote.json',JSON.stringify({verifiedAt:new Date().toISOString(),projectHost:new URL(process.env.SUPABASE_URL).hostname,excluded,remainingFish:fish,scope:'Habitat rows only; no species, holdings or pending fishing casts changed.'},null,2)+'\n')
console.log(`Remote verified: ${excluded.length} shared fish habitats removed; 20 primal-native fish remain.`)
