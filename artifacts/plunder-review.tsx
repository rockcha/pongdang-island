import {createRoot} from 'react-dom/client'
import {CollectiblePreview} from '/src/features/collection/collectible-preview'
import {TankInhabitants} from '/src/features/aquarium/tank-inhabitants'
import catalog from '/supabase/catalog/catalog.json'
import type {Species,OwnedCollectible} from '/src/features/collection/api'
import '/src/index.css'
const rows=catalog.collectible_species.filter(s=>s.native_region_id==='plunder')
const species=rows.map(s=>({...s,speed:Number(s.speed),swim_y_min:s.swim_y_min===null?null:Number(s.swim_y_min),swim_y_max:s.swim_y_max===null?null:Number(s.swim_y_max)}) as Species)
const mythics=species.filter(s=>s.rarity==='mythic')
const items=mythics.map((s,i)=>({id:'review-'+s.id,species_id:s.id,tank_id:'preview',animation_seed:i*500000,position_x:20+i*30,position_y:s.movement_type==='crawl'?92:35+i*20,acquired_at:new Date().toISOString(),species:s}) as OwnedCollectible)
createRoot(document.getElementById('root')!).render(<main className="mx-auto max-w-5xl space-y-6 p-5"><h1 className="text-2xl">약탈자의 항로</h1><img className="h-56 w-full rounded-2xl object-cover" src="/banners/plunder-horizon-v1.png"/><div className="grid grid-cols-2 gap-4"><img className="w-full rounded-2xl" src="/assets/storage-upload/new/20261027-034411/region-art/map-v1.png"/><p className="self-center">지도 4조각 · 47종<br/>일반 55 · 희귀 240 · 특급 750 · 신화 2,800</p></div><div style={{height:420,position:'relative',overflow:'hidden',borderRadius:20,background:'linear-gradient(#377e98,#0c263e)'}}><TankInhabitants items={items} preview/></div><div className="grid grid-cols-1 gap-4 sm:grid-cols-3">{mythics.map(s=><section key={s.id} className="grid justify-items-center rounded-2xl bg-card p-3"><CollectiblePreview species={s}/><p>{s.name}</p></section>)}</div><div className="grid grid-cols-3 gap-3 sm:grid-cols-6">{species.map(s=><section key={s.id} className="rounded-xl bg-card p-2 text-center"><img src={'/assets/storage-upload/new/20261027-034411/'+s.thumbnail_path} className="aspect-square w-full object-contain"/><p className="text-xs">{s.name}</p></section>)}</div></main>)
