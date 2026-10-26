import {createRoot} from 'react-dom/client'
import {TankInhabitants} from '/src/features/aquarium/tank-inhabitants'
import catalog from '/supabase/catalog/catalog.json'
import '/src/index.css'
const ids=['discarded-battery','broken-generator','rusty-cogwheel']
const species=ids.map(id=>catalog.collectible_species.find(s=>s.id===id)!)
const items=species.map((s,i)=>({id:'trash-preview-'+i,species_id:s.id,species:s,position_x:null,position_y:null,position_locked:false,animation_seed:1000+i*154321,tank_id:'preview',acquired_at:new Date().toISOString(),scale:1,rotation:0}))
createRoot(document.getElementById('root')!).render(<main style={{maxWidth:780,margin:'auto',padding:16}}><h1 className="py-4 text-xl">일반 쓰레기 · 각 3골드</h1><div style={{height:420,position:'relative',overflow:'hidden',borderRadius:16,background:'linear-gradient(#b0d5d7,#528f9e 86%,#bca37f 87%,#cbb18e)'}}><TankInhabitants items={items} world={{columns:3,overview:true,onFrame:frame=>{window.__industrialFrame=frame}}}/></div><div className="mt-4 grid grid-cols-3 gap-3">{species.map(s=><article key={s.id} className="rounded-xl border bg-card p-3 text-center"><img src={'/assets/storage-upload/new/20261026-032115/'+s.thumbnail_path} alt={s.name} className="mx-auto aspect-square w-full max-w-40 object-contain"/><p className="mt-2 text-sm">{s.name}</p><p className="mt-1 text-xs text-muted-foreground">일반 쓰레기 · {s.sell_price}골드</p></article>)}</div></main>)
