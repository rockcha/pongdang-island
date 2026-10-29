import {useState} from 'react'
import {Link} from 'react-router'
import {Search,ArrowUpRight} from 'lucide-react'
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog'
import {placeGroups} from '@/lib/place-groups'
import type {Facility} from './island-model'
import {Building} from './island-art'
import {buildingViewBox} from './island-art-sizing'

export function IslandPlacesDialog({open,onOpenChange,facilities}:{open:boolean;onOpenChange:(open:boolean)=>void;facilities:Facility[]}){
 const [search,setSearch]=useState(''),[group,setGroup]=useState('all')
 const paths=placeGroups.find(g=>g.id===group)?.sections.flatMap(s=>s.paths)
 const items=facilities.filter(f=>f.to&&(!paths||paths.includes(f.to))&&f.name.includes(search.trim()))
 return <Dialog open={open} onOpenChange={onOpenChange}>
  <DialogContent className="island-places-dialog">
   <div className="island-places-heading"><DialogTitle>어디로 갈까요?</DialogTitle><DialogDescription>섬의 장소를 찾아 바로 이동해요.</DialogDescription></div>
   <label className="island-places-search"><Search size={17} aria-hidden="true"/><input aria-label="섬의 장소 검색" placeholder="장소 이름 검색" value={search} onChange={e=>setSearch(e.target.value)}/></label>
   <div className="island-places-categories" role="group" aria-label="장소 분류">
    {[{id:'all',label:'전체'},...placeGroups].map(g=><button key={g.id} aria-pressed={group===g.id} onClick={()=>setGroup(g.id)}>{g.label}</button>)}
   </div>
   <nav className="island-places-grid" aria-label="섬의 장소 목록">
    {items.map(f=><Link key={f.id} to={f.to!} onClick={()=>onOpenChange(false)}>
     <svg viewBox={buildingViewBox(f)} aria-hidden="true"><Building f={f}/></svg>
     <span>{f.name}</span><ArrowUpRight className="island-place-arrow" size={13} aria-hidden="true"/>
    </Link>)}
    {!items.length&&<p className="island-places-empty">찾는 장소가 없어요.</p>}
   </nav>
  </DialogContent>
 </Dialog>
}
