import {useState} from 'react'
import {BookOpen,Check,ChevronLeft,Search} from 'lucide-react'
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog'
import {petSpecies,petJobsFor,petJobDuration,type PetSpeciesId} from './pet-catalog'
import {PetGold} from './pet-jobs-panel'
import './pet-collection.css'

export function PetCollectionDialog({open,onOpenChange,pets}:{open:boolean;onOpenChange:(open:boolean)=>void;pets:readonly {speciesId:PetSpeciesId}[]}){
 const [search,setSearch]=useState(''),[selected,setSelected]=useState<PetSpeciesId|null>(null)
 const owned=new Set(pets.map(p=>p.speciesId))
 const species=petSpecies.find(p=>p.id===selected)
 const filtered=petSpecies.filter(p=>`${p.name} ${p.description}`.includes(search.trim()))
 return <Dialog open={open} onOpenChange={value=>{onOpenChange(value);if(!value){setSelected(null);setSearch('')}}}>
  <DialogContent className="pet-collection-dialog">
   <header className="pet-collection-header"><BookOpen size={20}/><div><DialogTitle>펫도감</DialogTitle><DialogDescription>작은 친구들의 이야기를 만나보세요.</DialogDescription></div></header>
   {species?<div className="pet-collection-body">
    <button className="pet-collection-back" onClick={()=>setSelected(null)}><ChevronLeft size={15}/>전체 친구</button>
    <div className="pet-collection-profile"><img src={`/pets/${species.id}_v1_thumbnail.png`} alt={species.name}/><span className="pet-collection-badge">{owned.has(species.id)?'보유 중':'미보유'}</span><h3>{species.name}</h3><p>{species.description}</p></div>
    <h4 className="pet-collection-job-title">전용 아르바이트 <small>기본 보수 · 강화 보너스 제외</small></h4>
    <div className="pet-collection-jobs">{petJobsFor(species.id).map(job=><article key={job.id}><strong>{job.name}</strong><p>{job.description}</p><div><span>{petJobDuration(job.minutes)}</span><PetGold value={`${job.min.toLocaleString()}–${job.max.toLocaleString()}`}/></div></article>)}</div>
   </div>:<>
    <div className="pet-collection-summary"><span>보유한 종류 <strong>{petSpecies.filter(p=>owned.has(p.id)).length}<small> / {petSpecies.length}</small></strong></span><progress aria-label="보유한 펫 종류" value={petSpecies.filter(p=>owned.has(p.id)).length} max={petSpecies.length}/></div>
    <label className="pet-collection-search"><Search size={16}/><input aria-label="펫도감 검색" placeholder="친구 이름으로 검색" value={search} onChange={e=>setSearch(e.target.value)}/></label>
    <div className="pet-collection-body"><div className="pet-collection-grid">{filtered.map((pet)=><button key={pet.id} className="pet-collection-card" onClick={()=>setSelected(pet.id)} aria-label={`${pet.name} 상세 보기`}><span className="pet-collection-art"><img src={`/pets/${pet.id}_v1_thumbnail.png`} alt="" loading="lazy"/></span><strong>{pet.name}</strong><span className="pet-collection-owned" data-owned={owned.has(pet.id)}>{owned.has(pet.id)?<><Check size={11}/>보유 중</>:'미보유'}</span></button>)}</div>{!filtered.length&&<p className="pet-collection-empty">검색한 친구를 찾지 못했어요.</p>}</div>
   </>}
  </DialogContent>
 </Dialog>
}
