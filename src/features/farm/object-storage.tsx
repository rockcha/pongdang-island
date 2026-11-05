import {Building2,Flower2,PawPrint} from 'lucide-react'
import {TopviewArt} from './topview-art'
import {FarmCountBadge} from './count-badge'
import {topviewItems,type FarmTool,type TopviewState} from './topview-model'
import {FarmToolPanel} from './farm-tool-panel'

export type StorageCategory='건물'|'동물'|'꾸미기'
export function FarmObjectStorage({state,category,selected,onCategory,onPlace,onDone}:{state:TopviewState;category:StorageCategory;selected:FarmTool|null;onCategory:(category:StorageCategory)=>void;onPlace:(kind:FarmTool)=>void;onDone:()=>void}){
 const kinds=[...new Set(state.stored)].filter(kind=>topviewItems[kind].group===category)
 const shelf=<section className="farm-storage-shelf" aria-label={`${category==='꾸미기'?'장식':category} 보관함`}>
   {kinds.length?<div>{kinds.map(kind=>{
    const count=state.stored.filter(k=>k===kind).length
    return <button key={kind} aria-label={`${topviewItems[kind].name} 보관 ${count}개 배치하기`} aria-pressed={selected===kind} onClick={()=>onPlace(kind)}><TopviewArt kind={kind}/><span>{topviewItems[kind].name}</span><FarmCountBadge count={count} label={`${topviewItems[kind].name} 보관`}/></button>
   })}</div>:<p>보관 중인 개체가 없어요.</p>}
  </section>
 return <FarmToolPanel id="farm-storage-menu" label="보관함 메뉴" title="보관함" description={selected?`${topviewItems[selected].name} 선택 중 · 빈 땅을 눌러 배치해요.`:'분류를 고르고, 보관 중인 물건을 선택해 배치해요.'} onDone={onDone} content={shelf}>{(['건물','동물','꾸미기'] as const).map(group=>{
   const Icon={건물:Building2,동물:PawPrint,꾸미기:Flower2}[group],label=group==='꾸미기'?'장식':group,count=state.stored.filter(kind=>topviewItems[kind].group===group).length
   return <button key={group} aria-label={label} aria-pressed={category===group} onClick={()=>onCategory(group)}><Icon size={17}/><span>{label}</span><FarmCountBadge count={count} label={`${label} 보관`}/></button>
  })}</FarmToolPanel>
}
