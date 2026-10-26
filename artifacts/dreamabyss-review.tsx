import {createRoot} from 'react-dom/client'
import {TankInhabitants} from '/src/features/aquarium/tank-inhabitants'
import {CollectiblePreview} from '/src/features/collection/collectible-preview'
import catalog from '/supabase/catalog/catalog.json'
import manifest from '/assets/storage-upload/new/20261026-033245/manifest.json'
import '/src/index.css'
const species=manifest.items.map(i=>catalog.collectible_species.find(s=>s.id===i.id)!)
const items=species.map((s,i)=>({id:'abyss-preview-'+i,species_id:s.id,species:s,position_x:null,position_y:null,position_locked:false,animation_seed:1000+i*154321,tank_id:'preview',acquired_at:new Date().toISOString(),scale:1,rotation:0}))
const params=new URLSearchParams(location.search),theme=params.get('theme')??'light',background=theme==='dark'?'#171728':'#fff8ee'
const assetUrl=(path:string)=>'/assets/storage-upload/new/20261026-033245/'+path.replace('dreamabyss-ancient-sleeper_swim8_sprite.png','dreamabyss-ancient-sleeper_swim8_v1_sprite.png')
createRoot(document.getElementById('root')!).render(<main style={{maxWidth:1000,margin:'auto',padding:16,background,color:theme==='dark'?'#f5edf7':'#65462f'}}><h1 style={{padding:'12px 0',fontSize:24}}>꿈먹는 심연 · 신규 10종</h1><div id="tank" style={{height:520,position:'relative',overflow:'hidden',borderRadius:16,background:'linear-gradient(#3d355e,#18182c 86%,#5c4c71 87%,#6d5e77)'}}><TankInhabitants items={items} world={{columns:3,overview:true,assetUrl,onFrame:frame=>{window.__abyssFrame=frame}}}/></div><div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:8,marginTop:16}}>{species.map(s=><article key={s.id} data-species={s.id} style={{border:'1px solid #a8897a55',borderRadius:12,padding:8,textAlign:'center'}}><CollectiblePreview species={s}/><p style={{fontSize:13}}>{s.name}</p><p style={{fontSize:11,opacity:.7}}>{s.rarity} · {s.sell_price}골드 · {s.movement_type}</p></article>)}</div></main>)
