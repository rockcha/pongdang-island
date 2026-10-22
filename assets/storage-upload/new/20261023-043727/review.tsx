import {createRoot} from 'react-dom/client'
import {TankInhabitants} from '/src/features/aquarium/tank-inhabitants'
import {HabitatFilters} from '/src/features/collection/habitat-icons'
import {regionIcons} from '/src/features/regions/region-icons'
import manifest from './manifest.json'
import '/src/index.css'
const root='/assets/storage-upload/new/20261023-043727/'
const items=manifest.items.map((s,i)=>({id:'preview-'+s.id,species_id:s.id,tank_id:'preview',animation_seed:i*7919,position_x:null,position_y:null,acquired_at:new Date().toISOString(),species:s}))
createRoot(document.getElementById('root')!).render(<main style={{maxWidth:720,margin:'auto',padding:24,background:'#fff7eb'}}>
 <h1>냠냠 한상바다 · 희귀 친구</h1>
 <div style={{display:'flex',gap:20}}>{manifest.items.map(s=><article key={s.id} style={{flex:1,textAlign:'center'}}><img data-thumbnail src={root+s.thumbnail_path} alt={s.name} style={{width:'100%'}}/><p>{s.name} · {s.sell_price}G</p></article>)}</div>
 <div style={{position:'relative',height:360,overflow:'hidden',borderRadius:16,background:'linear-gradient(#428b9a,#123851)'}}><TankInhabitants items={items}/></div>
 <section style={{marginTop:24}}><h2>해역 아이콘</h2><div style={{display:'flex',gap:32,margin:'12px 0'}}>{['siren','nyamnyam'].map(id=><div key={id}><p>{regionIcons[id].name}</p>{[24,36,64].map(size=><img key={size} src={regionIcons[id].src} alt='' style={{width:size,height:size,display:'inline-block',objectFit:'contain'}}/>)}</div>)}</div><HabitatFilters habitats={['siren','nyamnyam'].map(id=>({id,name:regionIcons[id].name}))} selected={[]} onToggle={()=>{}}/></section>
</main>)
