import {createRoot} from 'react-dom/client'
import {MemoryRouter} from 'react-router'
import {useState} from 'react'
import {AquariumView} from '/src/features/aquarium/aquarium-view'
import {AquariumTankPicker} from '/src/features/aquarium/aquarium-tank-picker'
import {AquariumOverview} from '/src/features/aquarium/aquarium-overview'
import {Dialog,DialogContent,DialogHeader,DialogTitle} from '/src/components/ui/dialog'
import {Button} from '/src/components/ui/button'
import {Pencil} from 'lucide-react'
import type {OwnedCollectible} from '/src/features/collection/api'
import {appArt} from '/src/components/app-art'
import catalog from '/supabase/catalog/catalog.json'
import '/src/index.css'

const ids=['plump-horse-mackerel','pongul','silver-anchovy','striped-mackerel','mint-mahi-mahi','coral-seabream','apricot-starfish','rusty-mini-anchor','glass-bottle']
const fixtures=ids.map((id,index)=>{
 const species=catalog.collectible_species.find(s=>s.id===id)!
 const local=(path:string)=>new URL('/assets/storage-upload/collectibles/'+path,location.origin).href
 return {id:'preview-'+id,species_id:id,tank_id:'one',animation_seed:12345+index*9711,position_x:index<6?null:id==='apricot-starfish'?.3:.7,position_y:index<6?null:.8,rotation:0,scale:1,acquired_at:'',species:{...species,thumbnail_path:local(species.thumbnail_path),sprite_sheet_path:species.sprite_sheet_path?local(species.sprite_sheet_path):null}}
}) as unknown as OwnedCollectible[]
function Preview(){
 const [items,setItems]=useState(fixtures),[id,setId]=useState('one'),[expanded,setExpanded]=useState(false)
 const [tanks,setTanks]=useState([{id:'one',name:'나의 작은 바다',background_id:'default',is_representative:true},{id:'two',name:'산호 정원',background_id:'default',is_representative:false}])
 const [renameId,setRenameId]=useState<string|null>(null),[draft,setDraft]=useState('')
 const background=catalog.aquarium_backgrounds.find(b=>b.id==='default')!
 const update=async(itemId:string,value:Partial<OwnedCollectible>)=>setItems(old=>old.map(i=>i.id===itemId?{...i,...value}:i))
 const open=(next:string)=>{setId(next);setExpanded(true)}
 const rename=(next:string)=>{setRenameId(next);setDraft(tanks.find(t=>t.id===next)!.name)}
 return <MemoryRouter><main className="mx-auto flex h-dvh max-w-md flex-col"><AquariumView autoWide={expanded} onWideExit={()=>setExpanded(false)} overviewContent={!expanded?<AquariumOverview state={{tanks,catalog:[background],tankCapacity:50}} items={items} busy={false} scrollTop={0} onScroll={()=>{}} onSelect={open} onRename={rename}/>:undefined} tankId={id} name={tanks.find(t=>t.id===id)!.name} items={items.filter(i=>i.tank_id===id)} tankCapacity={50} background={background} busy={false} onPlace={(id,x,y)=>void update(id,{position_x:x,position_y:y})} onArrange={update} onLayerChange={(id,layer)=>update(id,{display_layer:layer})} onSell={async()=>{}} selectorControls={<Button variant="ghost" aria-label="어항 이름 바꾸기" onClick={()=>rename(id)}><span className="truncate">{tanks.find(t=>t.id===id)!.name}</span><Pencil className="size-3"/></Button>} navigation={{index:tanks.findIndex(t=>t.id===id),count:2,onChange:()=>setId(id==='one'?'two':'one')}} storageControls={<button type="button"><appArt.storage className="size-6"/>보관함</button>} backgroundControls={<button>테마</button>} managementControls={<AquariumTankPicker triggerLabel="어항 관리" tanks={tanks} selectedId={id} backgrounds={[background]} busy={false} onSelect={open} onRename={rename} onRepresentative={async id=>setTanks(old=>old.map(t=>({...t,is_representative:t.id===id})))} onReorder={async ids=>setTanks(old=>ids.map(next=>old.find(t=>t.id===next)!))} onAdd={()=>{}}/>} nameControls={<Dialog open={!!renameId} onOpenChange={open=>{if(!open)setRenameId(null)}}><DialogContent><DialogHeader><DialogTitle>어항 이름 바꾸기</DialogTitle></DialogHeader><input aria-label="어항 이름" value={draft} maxLength={8} onChange={event=>setDraft(event.target.value)}/><Button onClick={()=>{setTanks(old=>old.map(t=>t.id===renameId?{...t,name:draft}:t));setRenameId(null)}}>저장</Button></DialogContent></Dialog>}/></main><output className="sr-only" data-testid="saved-positions">{JSON.stringify(items.map(i=>({id:i.id,x:i.position_x,y:i.position_y})))}</output></MemoryRouter>
}
createRoot(document.getElementById('root')!).render(<Preview/>)
