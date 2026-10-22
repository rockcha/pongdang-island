import {readFileSync,writeFileSync} from 'node:fs'
import {loadEnvFile} from 'node:process'
import {createClient} from '@supabase/supabase-js'
const root='assets/storage-upload/new/20261022-041530'
const manifest=JSON.parse(readFileSync(root+'/manifest.json','utf8'))
const catalog=JSON.parse(readFileSync('supabase/catalog/catalog.json','utf8'))
const template=catalog.collectible_species.find(s=>!manifest.entries.some(e=>e.id===s.id))
const descriptions=[
 '등에 쪽빛 잎을 달고 다니는 작은 양달팽이. 잎사귀 사이로 바닷물이 조용히 흐릅니다.',
 '분홍빛 몸에 물을 가득 머금은 바다돼지. 짧은 발로 해저를 느릿하게 산책합니다.',
 '은빛 비늘과 옅은 분홍 옆줄을 지닌 연어. 꼬리가 지날 때마다 물결이 반짝입니다.',
 '어느 자물쇠에도 맞지 않는 낡은 열쇠. 무엇을 열었는지는 열쇠도 잊은 모양입니다.',
 '발끝에 구멍이 난 줄무늬 양말. 작은 해초가 새 주인처럼 고개를 내밀고 있습니다.',
 '물고기 그림만 남은 빈 미끼 봉지. 내용물은 바다 친구들이 먼저 맛본 것 같습니다.',
 '푸른 가지 같은 날개를 펼치는 갯민숭달팽이. 은빛 몸이 물결 사이에서 작게 빛납니다.',
 '붉은 치맛자락을 너울거리며 헤엄치는 바다의 무희. 물살이 닿으면 가장자리부터 춤이 시작됩니다.',
 '긴 꼬리와 은빛 몸을 지닌 유령상어. 소리 없이 활공하며 어두운 물길을 건넙니다.',
 '살구색 고리무늬 망토를 두른 작은 고둥. 조용한 걸음마다 더듬이가 먼저 길을 살핍니다.',
 '심홍빛 팔막으로 몸을 감싸는 흡혈오징어. 망토를 펼치면 푸른 눈빛이 어둠 위로 떠오릅니다.',
 '물속에 오색 비단을 펼치는 담요문어. 긴 팔막의 주름을 따라 빛이 느리게 번집니다.',
 '붉은 유리 왕관 같은 심해 해파리. 맥동할 때마다 가장자리를 따라 푸른 빛이 돕니다.',
 '자개빛 팔과 유려한 지느러미를 지닌 황제오징어. 몸을 기울이면 진주색 광택이 흘러내립니다.',
 '청금석빛 갓 안에 금빛 가지를 품은 해파리. 가느다란 촉수는 깊은 물속의 샹들리에처럼 흔들립니다.',
 '작은 물고기들이 모여 하나의 거대한 존재를 이룹니다. 흩어진 뒤의 빈자리에도 같은 윤곽이 남습니다.',
 '잊힌 별의 껍질을 닮은 심해 생물. 빛을 내뿜는 대신 중심의 공허로 천천히 들이쉽니다.',
 '푸른 잔광이 오래된 뼈를 이어 놓은 고래. 떨어진 뼛조각은 가라앉지 않고 몸의 주위를 맴돕니다.',
 '일식의 고리를 두른 흑요석빛 해룡. 몸이 고리 안을 스칠 때 비늘 사이로 황금빛 새벽이 새어 나옵니다.',
 '긴 몸으로 수평선을 감아 품은 바다뱀. 고리 안쪽의 바다는 바깥 물살과 다른 방향으로 흐릅니다.',
 '등에 작은 산호 섬을 이고 잠든 듯 유영하는 거대한 존재. 숨결마다 섬의 불빛이 별처럼 떠오릅니다.',
 '나선의 몸 한가운데 바다의 깊이를 품은 존재. 금빛 입자는 가장자리에서 중심으로 끝없이 흘러갑니다.',
 '구름나루 물밑에서 건진 하얀 가면. 보랏빛 자국 아래로 소금기가 희미하게 남아 있습니다.',
 '붉은 가죽이 군데군데 벗겨진 작은 구두. 주인이 지나간 길은 물결 속으로 사라졌습니다.',
 '어느 역으로 가는지 읽을 수 없는 기차표. 젖은 모서리가 바람 대신 물살에 접힙니다.',
 '하늘을 달렸을지도 모를 부러진 빗자루. 풀린 짚 사이에 아주 작은 마력이 남아 있습니다.',
 '푸른 유리 장식이 박힌 낡은 마법 열쇠. 주인을 잃었어도 희미한 빛은 꺼지지 않습니다.',
]
const columns=new Set(JSON.parse(readFileSync('docs/db/local-schema.json','utf8')).structure.columns.filter(c=>c.schema==='public'&&c.table==='collectible_species').map(c=>c.name))
const rows=manifest.entries.map((e,i)=>{
 const crawl=e.movement_type==='crawl',fixed=e.movement_type==='fixed',pulse=e.movement_type==='pulse'
 // Trash retains a positive stored speed to satisfy the legacy kind constraint;
 // movement_type=fixed makes the renderer keep it stationary.
 const row={id:e.id,kind:e.kind,name:e.name,description:descriptions[i],rarity:e.rarity,sell_price:e.sell_price,thumbnail_path:e.thumbnail_path,sprite_sheet_path:e.frames>1?e.storage_path:null,native_region_id:e.native_region_id,movement_type:e.movement_type,swim_y_min:fixed?.9:crawl?.86:pulse?.2:.15,swim_y_max:fixed?.98:crawl?.96:pulse?.72:.8,speed:fixed?.001:crawl?.006:pulse?.009:.022,size:e.kind==='trash'?e.rarity==='epic'?68:52:e.rarity==='mythic'?145:e.rarity==='epic'?100:e.rarity==='rare'?76:64,flip_with_direction:!fixed,travel_direction:'both'}
 if(columns.has('facing_direction'))row.facing_direction=fixed?null:'right'
 if(e.frames===6)row.sprite_sheet_path=e.storage_path.replace('_sprite.png','_compat_sprite.png')
 for(const key of ['swim_y_min','swim_y_max','speed'])row[key]=String(row[key])
 return Object.fromEntries(Object.keys(template).map(key=>[key,Object.hasOwn(row,key)?row[key]:template[key]]))
})
if(process.argv.includes('--catalog')){
 const preflight=JSON.parse(readFileSync(root+'/preflight.json','utf8'))
 if(preflight.project!=='ewafafphiovbpjwogwzn.supabase.co'||preflight.existing.length||preflight.nameMatches.length)throw Error('Preflight conflict')
 for(const row of rows){
  const existing=catalog.collectible_species.find(s=>s.id===row.id)
  if(existing&&(existing.name!==row.name||existing.kind!==row.kind||existing.rarity!==row.rarity))throw Error('Local identity conflict '+row.id)
  if(existing)catalog.collectible_species[catalog.collectible_species.indexOf(existing)]=row;else catalog.collectible_species.push(row)
  const habitats=row.native_region_id?[row.native_region_id]:preflight.regions.map(r=>r.id)
  for(const region_id of habitats)if(!catalog.collectible_habitats.some(h=>h.species_id===row.id&&h.region_id===region_id))catalog.collectible_habitats.push({species_id:row.id,region_id})
 }
 catalog.collectible_species.sort((a,b)=>a.id.localeCompare(b.id))
 catalog.collectible_habitats.sort((a,b)=>a.species_id.localeCompare(b.species_id)||a.region_id.localeCompare(b.region_id))
 writeFileSync('supabase/catalog/catalog.json',JSON.stringify(catalog,null,2)+'\n')
 console.log('Catalog prepared: '+rows.length)
}
if(process.argv.includes('--remote')){
 loadEnvFile('.env.storage.local')
 if(new URL(process.env.SUPABASE_URL).hostname!=='ewafafphiovbpjwogwzn.supabase.co')throw Error('Wrong target')
 const client=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SECRET_KEY,{auth:{persistSession:false}})
 const check=r=>{if(r.error)throw Error(r.error.message);return r.data}
 const existing=check(await client.from('collectible_species').select('id,name,rarity,kind').in('id',rows.map(r=>r.id)))
 for(const actual of existing){const expected=rows.find(r=>r.id===actual.id);if(actual.name!==expected.name||actual.rarity!==expected.rarity||actual.kind!==expected.kind)throw Error('Remote identity conflict')}
 for(const row of rows)for(const path of [row.thumbnail_path,row.sprite_sheet_path].filter(Boolean)){
  const response=await fetch(client.storage.from('collectibles').getPublicUrl(path).data.publicUrl,{method:'HEAD'})
  if(!response.ok)throw Error('Missing Storage image '+path)
 }
 // Import native identities as shared first so their required habitat rows can
 // be created before setting the native region. Existing players are untouched.
 check(await client.from('collectible_species').upsert(rows.map(r=>({...r,native_region_id:null,...(columns.has('facing_direction')?{}:{facing_direction:r.kind==='fish'?'right':null})}))))
 const habitats=catalog.collectible_habitats.filter(h=>rows.some(r=>r.id===h.species_id))
 check(await client.from('collectible_habitats').upsert(habitats,{onConflict:'species_id,region_id',ignoreDuplicates:true}))
 check(await client.from('collectible_species').update({native_region_id:'cloudferry'}).in('id',rows.filter(r=>r.native_region_id).map(r=>r.id)))
 const verified=check(await client.from('collectible_species').select('*').in('id',rows.map(r=>r.id)))
 const actualHabitats=check(await client.from('collectible_habitats').select('species_id,region_id').in('species_id',rows.map(r=>r.id)))
 for(const expected of rows){const actual=verified.find(r=>r.id===expected.id);for(const key of Object.keys(expected))if(String(actual[key])!==String(expected[key]))throw Error('Readback mismatch '+expected.id+'/'+key)}
 for(const expected of habitats)if(!actualHabitats.some(h=>h.species_id===expected.species_id&&h.region_id===expected.region_id))throw Error('Missing habitat')
 writeFileSync(root+'/remote-verification.json',JSON.stringify({project:new URL(process.env.SUPABASE_URL).hostname,verifiedAt:new Date().toISOString(),scope:'27 new identities, prices, movement settings and habitats; not complete schema parity or migration history',species:verified.map(({id,name,rarity,kind,sell_price,native_region_id,movement_type,swim_y_min,swim_y_max})=>({id,name,rarity,kind,sell_price,native_region_id,movement_type,swim_y_min,swim_y_max})),habitats:actualHabitats},null,2))
 console.log('Remote verified: '+verified.length)
}
