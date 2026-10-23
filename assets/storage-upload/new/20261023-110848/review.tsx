import {createRoot} from 'react-dom/client'
import {TankInhabitants} from '/src/features/aquarium/tank-inhabitants'
import {CollectiblePreview} from '/src/features/collection/collectible-preview'
import manifest from './manifest.json'
import '/src/index.css'
const species=manifest.items.map(s=>({...s,sprite_sheet_path:s.sprite_sheet_path}))
const items=species.map((s,i)=>({id:'preview-'+s.id,species_id:s.id,tank_id:'preview',animation_seed:i*7919,position_x:null,position_y:null,acquired_at:new Date().toISOString(),species:s}))
createRoot(document.getElementById('root')!).render(<main style={{padding:20,maxWidth:900,margin:'auto',background:'#fff7eb'}}><h1>신규 바다 개체</h1><div style={{display:'flex',gap:10}}>{species.map(s=><article key={s.id} data-species={s.id} style={{flex:1,minWidth:0,textAlign:'center'}}><img src={'/assets/storage-upload/new/20261023-110848/'+s.thumbnail_path} alt={s.name} style={{width:'100%'}}/><p>{s.name}</p><p>{s.native_region_id?'원시섬 신화':'공통 특급'} · {s.sell_price}G</p></article>)}</div><div data-tank style={{position:'relative',height:400,overflow:'hidden',borderRadius:16,background:'linear-gradient(#428b9a,#123851)'}}><TankInhabitants items={items}/></div><h2>도감 동작 미리보기</h2><div style={{display:'flex',flexWrap:'wrap'}}>{species.map(s=><div key={s.id} data-preview={s.id}><CollectiblePreview species={s}/></div>)}</div></main>)
