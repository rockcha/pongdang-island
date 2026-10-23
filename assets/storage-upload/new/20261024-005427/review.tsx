import {createRoot} from 'react-dom/client'
import {TankInhabitants} from '/src/features/aquarium/tank-inhabitants'
import {CollectiblePreview} from '/src/features/collection/collectible-preview'
import manifest from './manifest.json'
import '/src/index.css'
const root='/assets/storage-upload/new/20261024-005427/'
const species=manifest.items.map(s=>({...s,speed:Number(s.speed),sprite_sheet_path:new URL(root+s.sprite_sheet_path,location.origin).href,thumbnail_path:new URL(root+s.thumbnail_path,location.origin).href}))
const items=species.map((s,i)=>({id:'review-'+s.id,species_id:s.id,tank_id:'review',animation_seed:i*7919,position_x:null,position_y:null,acquired_at:new Date().toISOString(),species:s}))
createRoot(document.getElementById('root')!).render(<main style={{maxWidth:1050,margin:'0 auto',padding:16,background:'#eee5f3'}}>
 <h1>할로윈 어종 5종 · 로컬 초안</h1>
 <div data-tank style={{height:340,position:'relative',overflow:'hidden',borderRadius:16,background:'linear-gradient(#486385,#221735)'}}><TankInhabitants items={items as any}/></div>
 <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:12}}>{species.map(s=><article key={s.id} data-species={s.id} style={{background:'#fff',padding:8,borderRadius:12}}><img src={s.thumbnail_path} alt={s.name} style={{width:'100%',aspectRatio:'1',objectFit:'contain'}}/><p style={{fontSize:12}}>{s.name} · {s.rarity==='rare'?'희귀':'일반'} · {s.sell_price}G</p><div data-preview><CollectiblePreview species={s as any}/></div></article>)}</div>
</main>)
