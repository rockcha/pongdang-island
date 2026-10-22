import {createRoot} from 'react-dom/client'
import {TankInhabitants} from '/src/features/aquarium/tank-inhabitants'
import manifest from './manifest.json'
import '/src/index.css'

const root='/assets/storage-upload/new/20261023-034400/'
const groups=[['mythic','신화'],['epic','특급'],['rare','희귀'],['common','일반']]
function tank(items:any[]){return items.map((s,i)=>({id:'review-'+s.id,species_id:s.id,tank_id:'review',animation_seed:i*7919,position_x:s.kind==='decoration'?(.15+i*.14)% .8+.05:null,position_y:s.kind==='decoration'?.88:null,acquired_at:new Date().toISOString(),species:{...s,sprite_sheet_path:s.catalog_sprite_sheet_path??s.sprite_sheet_path,speed:Number(s.speed)}}))}
createRoot(document.getElementById('root')!).render(<main className="mx-auto max-w-5xl space-y-6 p-4" style={{background:'#fcf3e7'}}><h1 className="text-xl">냠냠 한상바다 · 48종 제작 검수</h1>{groups.map(([rarity,label])=>{
 const species=manifest.items.filter(s=>s.rarity===rarity)
 return <section key={rarity} className="space-y-3"><h2 className="text-lg">{label}</h2><div className="grid grid-cols-3 gap-2 sm:grid-cols-6">{species.map(s=><article data-species={s.id} key={s.id} className="rounded-lg border bg-white p-2 text-center"><img src={root+s.thumbnail_path} alt={s.name} className="aspect-square w-full object-contain"/><p className="text-xs">{s.name}</p><p className="text-[10px] text-muted-foreground">{s.kind} · {s.sell_price}G</p></article>)}</div><div className="relative h-80 overflow-hidden rounded-xl" style={{background:'linear-gradient(#438692,#143f60)'}}><TankInhabitants items={tank(species.filter(s=>s.kind==='fish'))}/></div></section>
 })}<h2 className="text-lg">장식품 움직임</h2><div className="relative h-96 overflow-hidden rounded-xl" style={{background:'linear-gradient(#438692,#143f60)'}}><TankInhabitants items={tank(manifest.items.filter(s=>s.kind==='decoration'))}/></div></main>)
