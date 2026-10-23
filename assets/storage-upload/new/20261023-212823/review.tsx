import {createRoot} from 'react-dom/client'
import {TankInhabitants} from '/src/features/aquarium/tank-inhabitants'
import manifest from './manifest.json'
import '/src/index.css'

const root='/assets/storage-upload/new/20261023-212823/'
const groups=[['common','일반'],['rare','희귀'],['epic','특급'],['mythic','신화']]
function tank(species:any[]){return species.map((s,i)=>({id:'review-'+s.id,species_id:s.id,tank_id:'review',animation_seed:i*7919,position_x:s.kind!=='fish'?(i+.5)/species.length:null,position_y:s.kind!=='fish'?.88:null,acquired_at:new Date().toISOString(),species:{...s,sprite_sheet_path:s.catalog_sprite_sheet_path??s.sprite_sheet_path,speed:Number(s.speed)}}))}
createRoot(document.getElementById('root')!).render(<main className="mx-auto max-w-5xl space-y-6 p-4" style={{background:'#fcf3e7'}}>
 <h1 className="text-xl">할로윈 · 51종 제작 검수</h1>
 {groups.map(([rarity,label])=>{
  const species=manifest.items.filter(s=>s.rarity===rarity)
  return <section key={rarity} className="space-y-3"><h2 className="text-lg">{label}</h2>
   <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">{species.map(s=><article data-species={s.id} key={s.id} className="rounded-lg border bg-white p-2 text-center"><img src={root+s.thumbnail_path} alt={s.name} className="aspect-square w-full object-contain"/><p className="text-xs">{s.name}</p><p className="text-[10px] text-muted-foreground">{s.kind} · {s.sell_price}G</p></article>)}</div>
   <div className="relative h-80 overflow-hidden rounded-xl" style={{background:'linear-gradient(#438692,#143f60)'}}><TankInhabitants items={tank(species.filter(s=>s.kind==='fish'))}/></div>
  </section>
 })}
 {(['trash','decoration'] as const).map(kind=><section key={kind}><h2 className="text-lg">{kind==='trash'?'쓰레기 배치':'장식물 배치'}</h2><div className="relative h-80 overflow-hidden rounded-xl" style={{background:'linear-gradient(#438692,#143f60)'}}><TankInhabitants items={tank(manifest.items.filter(s=>s.kind===kind))}/></div></section>)}
</main>)
