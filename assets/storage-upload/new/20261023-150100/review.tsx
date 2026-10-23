import {createRoot} from 'react-dom/client'
import {TankInhabitants} from '/src/features/aquarium/tank-inhabitants'
import {CollectiblePreview} from '/src/features/collection/collectible-preview'
import manifest from './manifest.json'
import '/src/index.css'
const root='/assets/storage-upload/new/20261023-150100/'
const items=manifest.items.map((s,i)=>({id:'review-'+s.id,species_id:s.id,tank_id:'review',animation_seed:i*7919,position_x:.2+i*.2,position_y:.35+i*.1,acquired_at:new Date().toISOString(),species:{...s,speed:Number(s.speed)}}))
createRoot(document.getElementById('root')!).render(<main className="mx-auto max-w-3xl space-y-4 bg-background p-4 text-foreground"><h1>일반 공통종 · 평균 55골드</h1><div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{manifest.items.map(s=><article key={s.id} className="rounded-xl border bg-card p-3 text-center"><img className="aspect-square w-full object-contain" src={root+s.thumbnail_path} alt={s.name}/><p className="text-sm">{s.name}</p><p className="text-xs">{s.sell_price}골드</p><CollectiblePreview species={s as any}/></article>)}</div><div style={{height:380,position:'relative',overflow:'hidden',borderRadius:16,background:'linear-gradient(#64afba,#204c6d)'}}><TankInhabitants items={items}/></div></main>)
