import {createRoot} from 'react-dom/client'
import {MemoryRouter} from 'react-router'
import {useState} from 'react'
import {AquariumView} from '/src/features/aquarium/aquarium-view'
import type {OwnedCollectible,DecorationPlacement} from '/src/features/collection/api'
import catalog from '/supabase/catalog/catalog.json'
import '/src/index.css'

const ids=['plump-horse-mackerel','pongul','silver-anchovy','striped-mackerel','mint-mahi-mahi','coral-seabream','apricot-starfish','rusty-mini-anchor','glass-bottle']
const fixtures=ids.map((id,index)=>{
 const original=catalog.collectible_species.find(species=>species.id===id)!
 const local=(path:string)=>new URL('/assets/storage-upload/collectibles/'+path,location.origin).href
 return {id:'local-'+id,species_id:id,tank_id:'local',animation_seed:12345+index*9711,position_x:index<6?null:id==='apricot-starfish'?.3:.7,position_y:index<6?null:.8,rotation:id==='apricot-starfish'?30:0,scale:id==='apricot-starfish'?1.2:1,position_locked:id==='glass-bottle',acquired_at:'',species:{...original,thumbnail_path:local(original.thumbnail_path),sprite_sheet_path:original.sprite_sheet_path?local(original.sprite_sheet_path):null}}
}) as unknown as OwnedCollectible[]
function Preview(){
 const [items,setItems]=useState(fixtures),[themeId,setThemeId]=useState('default')
 const theme=catalog.aquarium_backgrounds.find(theme=>theme.id===themeId)!
 const update=async(id:string,values:Partial<OwnedCollectible>)=>{setItems(old=>old.map(item=>item.id===id?{...item,...values}:item))}
 return <MemoryRouter><main className="mx-auto flex h-dvh max-w-[440px] flex-col bg-background text-foreground">
  <div className="flex shrink-0 gap-2 border-b p-2"><button className="min-h-11 flex-1 text-xs" onClick={()=>setThemeId('default')}>기본 테마</button><button className="min-h-11 flex-1 text-xs" onClick={()=>setThemeId('coral')}>산호 테마</button><select aria-label="테마 선택" className="min-w-0 flex-1 text-xs" value={themeId} onChange={event=>setThemeId(event.target.value)}>{catalog.aquarium_backgrounds.map(theme=><option key={theme.id} value={theme.id}>{theme.name}</option>)}</select></div>
  <AquariumView tankId="local" name="내 첫 어항" background={theme} items={items} busy={false} onPlace={(id,x,y)=>void update(id,{position_x:x,position_y:y})} onArrange={(id,value:DecorationPlacement)=>update(id,value)} onLayerChange={(id,layer)=>update(id,{display_layer:layer})} onSell={async ids=>setItems(old=>old.filter(item=>!ids.includes(item.id)))} onStore={async ids=>setItems(old=>old.filter(item=>!ids.includes(item.id)))}/>
  <output className="sr-only" data-testid="saved-preview-items">{JSON.stringify(items.map(({species,...item})=>({...item,name:species.name})))}</output>
 </main></MemoryRouter>
}
createRoot(document.getElementById('root')!).render(<Preview/>)
