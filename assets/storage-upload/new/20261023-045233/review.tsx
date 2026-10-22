import {createRoot} from 'react-dom/client'
import {TankInhabitants} from '/src/features/aquarium/tank-inhabitants'
import manifest from './manifest.json'
import '/src/index.css'
const root='/assets/storage-upload/new/20261023-045233/'
const items=manifest.items.map((s,i)=>({id:'preview-'+s.id,species_id:s.id,tank_id:'preview',animation_seed:i*7919,position_x:null,position_y:null,acquired_at:new Date().toISOString(),species:s}))
createRoot(document.getElementById('root')!).render(<main style={{maxWidth:820,margin:'auto',padding:20,background:'#fff7eb'}}><h1>냠냠 한상바다 · 새 친구</h1><div style={{display:'flex',gap:12}}>{manifest.items.map(s=><article key={s.id} style={{flex:1,minWidth:0,textAlign:'center'}}><img data-thumbnail src={root+s.thumbnail_path} alt={s.name} style={{width:'100%'}}/><p>{s.rarity==='common'?'일반':'특급'} · {s.name}</p><p>{s.sell_price}G</p></article>)}</div><div style={{position:'relative',height:400,overflow:'hidden',borderRadius:16,background:'linear-gradient(#428b9a,#123851)'}}><TankInhabitants items={items}/></div></main>)
