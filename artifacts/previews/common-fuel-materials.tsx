import {createRoot} from 'react-dom/client'
import {TankInhabitants} from '/src/features/aquarium/tank-inhabitants'
import catalog from '/supabase/catalog/catalog.json'
import manifest from '/assets/storage-upload/new/20261022-101350/manifest.json'
import '/src/index.css'
const species=manifest.entries.map(e=>catalog.collectible_species.find(s=>s.id===e.id)!)
const items=species.map((s,i)=>({id:'preview-'+s.id,species_id:s.id,tank_id:'preview',animation_seed:i*700003%1000000,position_x:null,position_y:null,acquired_at:new Date().toISOString(),species:{...s,swim_y_min:Number(s.swim_y_min),swim_y_max:Number(s.swim_y_max),speed:Number(s.speed)}}))
createRoot(document.getElementById('root')!).render(<main style={{maxWidth:1000,margin:'auto',padding:20}}><h1 style={{fontSize:22,marginBottom:16}}>공통 개체 · 일반</h1><div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:12}}>{species.map(s=><section key={s.id} style={{border:'1px solid #dcc8af',borderRadius:12,padding:10,textAlign:'center'}}><img src={'/assets/storage-upload/new/20261022-101350/'+s.thumbnail_path} style={{width:'100%',height:110,objectFit:'contain'}}/><p style={{fontSize:13}}>{s.name}</p><p style={{fontSize:12,color:'#886951'}}>{s.sell_price}골드</p></section>)}</div><div style={{width:390,height:350,margin:'20px auto',position:'relative',overflow:'hidden',borderRadius:16,background:'linear-gradient(#5eb8cf,#1e647f 85%,#c9b58d 85%)'}}><TankInhabitants items={items}/></div></main>)
