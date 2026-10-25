import {createRoot} from 'react-dom/client'
import {TankInhabitants} from '/src/features/aquarium/tank-inhabitants'
import {CollectiblePreview} from '/src/features/collection/collectible-preview'
import manifest from './manifest.json'
import '/src/index.css'
const root='/assets/storage-upload/new/20261025-071108/'
const species=manifest.items.map(s=>({...s,speed:Number(s.speed)}))
const items=species.map((s,i)=>({id:'review-'+s.id,species_id:s.id,tank_id:'review',animation_seed:i*7919,position_x:s.kind==='trash'?(i===5?.25:.75):null,position_y:s.kind==='trash'?.9:null,position_locked:s.kind==='trash',acquired_at:new Date().toISOString(),species:s}))
createRoot(document.getElementById('root')!).render(<main style={{maxWidth:1000,margin:'0 auto',padding:16,background:'#eee5f3'}}>
 <h1 className="text-xl">할로윈 신규 개체 7종</h1>
 <div data-tank style={{height:420,position:'relative',overflow:'hidden',borderRadius:16,background:'linear-gradient(#25567c,#15253d)'}}><TankInhabitants items={items}/></div>
 <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))',gap:12,marginTop:16}}>{species.map(s=><article key={s.id} data-species={s.id} style={{background:'#fff',padding:8,borderRadius:12}}><img src={root+s.thumbnail_path} alt={s.name} style={{width:'100%',aspectRatio:'1',objectFit:'contain'}}/><p style={{fontSize:12}}>{s.name} · {s.sell_price} G</p><div data-preview><CollectiblePreview species={s}/></div></article>)}</div>
</main>)
