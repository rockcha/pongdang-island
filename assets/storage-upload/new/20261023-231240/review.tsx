import {createRoot} from 'react-dom/client'
import {TankInhabitants} from '/src/features/aquarium/tank-inhabitants'
import {CollectiblePreview} from '/src/features/collection/collectible-preview'
import manifest from './manifest.json'
import '/src/index.css'
const root='/assets/storage-upload/new/20261023-231240/'
const species=manifest.items.map(s=>({...s,sprite_sheet_path:s.catalog_sprite_sheet_path??s.sprite_sheet_path,speed:Number(s.speed)}))
function items(group:any[]){return group.map((s,i)=>({id:'review-'+s.id,species_id:s.id,tank_id:'review',animation_seed:i*7919,position_x:null,position_y:null,acquired_at:new Date().toISOString(),species:s}))}
createRoot(document.getElementById('root')!).render(<main style={{maxWidth:1050,margin:'0 auto',padding:16,background:'#eee5f3'}}>
 <h1 className="text-xl">할로윈 신규 10종 · 누더기핀 재설계 검수</h1>
 {['common','epic','mythic'].map(rarity=>{const group=species.filter(s=>s.rarity===rarity);return <section key={rarity} style={{marginTop:20}}>
  <h2>{rarity}</h2><div data-tank={rarity} style={{height:340,position:'relative',overflow:'hidden',borderRadius:16,background:'linear-gradient(#486385,#221735)'}}><TankInhabitants items={items(group)}/></div>
  <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:12}}>{group.map(s=><article key={s.id} data-species={s.id} style={{background:'#fff',padding:8,borderRadius:12}}><img src={root+s.thumbnail_path} alt={s.name} style={{width:'100%',aspectRatio:'1',objectFit:'contain'}}/><p style={{fontSize:12}}>{s.name}</p><div data-preview><CollectiblePreview species={s}/></div></article>)}</div>
 </section>})}
</main>)
