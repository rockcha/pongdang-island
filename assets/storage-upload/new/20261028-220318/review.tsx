import {createRoot} from 'react-dom/client'
import {TankInhabitants} from '/src/features/aquarium/tank-inhabitants'
import {CollectiblePreview} from '/src/features/collection/collectible-preview'
import catalog from '/supabase/catalog/catalog.json'
import manifest from './manifest.json'
import '/src/index.css'
const species=manifest.items.map(item=>catalog.collectible_species.find(s=>s.id===item.id)!)
const items=species.map((s,i)=>({id:'review-'+s.id,species_id:s.id,tank_id:'review',animation_seed:137123+i*183533,position_x:s.kind==='fish'?null:i===2?.72:.52,position_y:s.kind==='fish'?null:.82,acquired_at:'',species:{...s,speed:Number(s.speed),swim_y_min:s.swim_y_min===null?null:Number(s.swim_y_min),swim_y_max:s.swim_y_max===null?null:Number(s.swim_y_max)}}))
createRoot(document.getElementById('root')!).render(<main style={{maxWidth:1000,margin:'auto',padding:16,background:'#fff7e9',color:'#593f30'}}>
 <h1 style={{fontSize:22}}>할로윈 특급 퐁이 2종</h1>
 <div data-tank style={{height:380,position:'relative',overflow:'hidden',borderRadius:16,background:'linear-gradient(#76bdca,#2f6474)'}}><TankInhabitants items={items}/></div>
 <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:12,marginTop:16}}>{items.map(({species:s})=><article key={s.id} data-species={s.id} style={{background:'#fff',padding:12,borderRadius:12}}><h2>{s.name} · {s.sell_price} G</h2><div data-preview><CollectiblePreview species={s} large/></div></article>)}</div>
</main>)
