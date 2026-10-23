import {createRoot} from 'react-dom/client'
import {AquariumBackdrop} from '/src/features/aquarium/aquarium-backdrop'
import {AquariumBackgroundDialog} from '/src/features/aquarium/aquarium-background-dialog'
import {TankInhabitants} from '/src/features/aquarium/tank-inhabitants'
import catalog from '/supabase/catalog/catalog.json'
import '/src/index.css'
const theme=catalog.aquarium_backgrounds.find(s=>s.id==='halloween-pumpkin-garden')!
const items=catalog.collectible_species.filter(s=>['halloween-little-ghost-puffer','halloween-ghost-skirt-guppy','halloween-masquerade-lionfish'].includes(s.id)).map((s,i)=>({id:'review-'+s.id,species_id:s.id,tank_id:'review',animation_seed:i*7919,position_x:null,position_y:null,acquired_at:new Date().toISOString(),species:{...s,speed:Number(s.speed),swim_y_min:Number(s.swim_y_min),swim_y_max:Number(s.swim_y_max)}}))
createRoot(document.getElementById('root')!).render(<main style={{maxWidth:480,margin:'0 auto',padding:12}}><h1>유령들이 밝힌 호박 정원 · 1,000골드</h1><div data-tank style={{height:'75dvh',minHeight:380,position:'relative',overflow:'hidden',borderRadius:16}}><AquariumBackdrop background={theme}/><TankInhabitants items={items as any}/></div><AquariumBackgroundDialog state={{catalog:[theme],owned:[]} as any} selectedId="default" gold={1000} busy={false} loading={false} error={false} onAct={async()=>{}}/></main>)
