import {createRoot} from 'react-dom/client'
import {TankInhabitants} from '/src/features/aquarium/tank-inhabitants'
import {CollectiblePreview} from '/src/features/collection/collectible-preview'
import type {Species,OwnedCollectible} from '/src/features/collection/api'
import catalog from '/supabase/catalog/catalog.json'
import manifest from '/assets/storage-upload/new/20261027-090400/manifest.json'
import '/src/index.css'
const ids=new Set(manifest.items.map(i=>i.id))
const species=catalog.collectible_species.filter(s=>ids.has(s.id)).map(s=>({...s,speed:Number(s.speed),swim_y_min:s.swim_y_min===null?null:Number(s.swim_y_min),swim_y_max:s.swim_y_max===null?null:Number(s.swim_y_max)}) as Species)
const items=species.map((s,i)=>({id:'review-'+s.id,species_id:s.id,tank_id:'review',animation_seed:i*500000,position_x:null,position_y:null,acquired_at:new Date().toISOString(),species:s}) as OwnedCollectible)
createRoot(document.getElementById('root')!).render(<main><h1>약탈자의 항로 · 해적 디테일</h1><p>탐욕의 황금손 · 저주받은 황금함대 · 해적 장비를 갖춘 7종</p><div className="tank" data-tank><TankInhabitants items={items} preview/></div><h2>도감에서 움직임 확인</h2><div className="grid" data-previews>{species.map(s=><article className="card" key={s.id} data-species={s.id}><CollectiblePreview species={s}/><p>{s.name}</p></article>)}</div><h2>외형</h2><div className="grid">{species.map(s=><article className="card" key={s.id}><img src={'/assets/storage-upload/new/20261027-090400/'+s.thumbnail_path}/><p>{s.name}</p></article>)}</div></main>)
