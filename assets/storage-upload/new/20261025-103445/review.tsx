import {createRoot} from 'react-dom/client'
import {TankInhabitants} from '/src/features/aquarium/tank-inhabitants'
import {CollectiblePreview} from '/src/features/collection/collectible-preview'
import manifest from './manifest.json'
import '/src/index.css'
const species=manifest.items.map(s=>({...s,speed:Number(s.speed),sprite_sheet_path:s.catalog_sprite_sheet_path}))
const items=species.map((s,i)=>({id:'review-'+s.id,species_id:s.id,tank_id:'review',animation_seed:137123+i*368533,position_x:.25+i*.4,position_y:.3+i*.2,acquired_at:new Date().toISOString(),species:s}))
createRoot(document.getElementById('root')!).render(<main style={{maxWidth:1000,margin:'auto',padding:16,background:'#eee5df'}}>
 <h1 className="text-xl">퐁이 이동형 신화 개체</h1>
 <div data-tank style={{height:450,position:'relative',overflow:'hidden',borderRadius:16,background:'linear-gradient(#23597c,#14253b)'}}><TankInhabitants items={items}/></div>
 <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:12,marginTop:16}}>{species.map(s=><article key={s.id} data-species={s.id} style={{background:'#fff',padding:12,borderRadius:12}}><h2>{s.name} · {s.sell_price} G</h2><div data-preview><CollectiblePreview species={s} large/></div></article>)}</div>
</main>)
