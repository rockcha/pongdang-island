import {createRoot} from 'react-dom/client'
import {TankInhabitants} from '/src/features/aquarium/tank-inhabitants'
import {CollectiblePreview} from '/src/features/collection/collectible-preview'
import manifest from './manifest.json'
import '/src/index.css'
const species=manifest.items.map(s=>({...s,sprite_sheet_path:s.catalog_sprite_sheet_path,speed:Number(s.speed)}))
const items=species.map((s,i)=>({id:'review-'+s.id,species_id:s.id,tank_id:'review',animation_seed:i*7919,position_x:null,position_y:null,acquired_at:new Date().toISOString(),species:s}))
createRoot(document.getElementById('root')!).render(<main className="mx-auto max-w-5xl space-y-6 p-4" style={{background:'#eee5f3'}}>
 <h1 className="text-xl">할로윈 신화 · 외형과 유령 공전 검수</h1>
 <div data-tank style={{height:384,position:'relative',overflow:'hidden',borderRadius:16,background:'linear-gradient(#486385,#221735)'}}><TankInhabitants items={items}/></div>
 <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">{species.map(s=><article key={s.id} data-species={s.id} className="rounded-xl bg-white p-2"><img src={'/assets/storage-upload/new/20261023-223836/'+s.thumbnail_path} alt={s.name}/><p className="text-sm">{s.name}</p><div data-preview><CollectiblePreview species={s}/></div></article>)}</div>
</main>)
