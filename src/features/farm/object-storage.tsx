import {FarmGold} from './farm-gold'
import {isResellableFarmKind,farmResalePrice} from './resale'
import {isRetiredTradeBuilding} from './market-catalog'
import {FarmTerrainBadge} from './terrain-badge'
import {FarmCategoryIcon} from './category-icon'
import {TopviewArt} from './topview-art'
import {FarmCountBadge} from './count-badge'
import {topviewItems,farmPlacementTerrain,type FarmTool,type TopviewState} from './topview-model'
import {FarmToolPanel} from './farm-tool-panel'

export type StorageCategory='건물'|'동물'|'꾸미기'
export function FarmObjectStorage({state,category,selected,onCategory,onPlace,onDone,onSell}:{state:TopviewState;category:StorageCategory;selected:FarmTool|null;onCategory:(category:StorageCategory)=>void;onPlace:(kind:FarmTool)=>void;onDone:()=>void;onSell?:(kind:FarmTool)=>void}){
 const kinds=[...new Set(state.stored)].filter(kind=>!isRetiredTradeBuilding(kind)&&topviewItems[kind].group===category)
 const shelf=<section className="farm-storage-shelf" aria-label={`${category==='꾸미기'?'장식':category} 보관함`}>
   {kinds.length?<div>{kinds.map(kind=>{
    const count=state.stored.filter(k=>k===kind).length
    return <div key={kind} className="farm-storage-item"><button aria-label={`${topviewItems[kind].name} 보관 ${count}개 배치하기`} aria-pressed={selected===kind} onClick={()=>onPlace(kind)}><span className="farm-item-art"><TopviewArt kind={kind} compact {...state.storedTransforms?.[kind]?.[0]}/>{category==='꾸미기'&&<FarmTerrainBadge terrain={farmPlacementTerrain(kind)}/>}</span><span>{topviewItems[kind].name}</span>{category==='꾸미기'&&<small className="farm-decoration-meta">{topviewItems[kind].w}×{topviewItems[kind].h}</small>}<FarmCountBadge count={count} label={`${topviewItems[kind].name} 보관`}/></button>{onSell&&isResellableFarmKind(kind)&&<button className="farm-object-sale-button" aria-label={topviewItems[kind].name+' 보관 개체 반값 판매'} onClick={()=>onSell(kind)}>판매 · +<FarmGold amount={farmResalePrice(kind).toLocaleString()}/></button>}</div>
   })}</div>:<p>보관 중인 개체가 없어요.</p>}
  </section>
 return <FarmToolPanel id="farm-storage-menu" label="보관함 메뉴" title="보관함" description={selected?`${topviewItems[selected].name} 선택 중 · 빈 ${farmPlacementTerrain(selected)==='sea'?'바다를':'땅을'} 눌러 배치해요.`:'분류를 고르고, 보관 중인 물건을 선택해 배치해요.'} onDone={onDone} content={shelf}>{(['건물','동물','꾸미기'] as const).map(group=>{
   const label=group==='꾸미기'?'장식':group,count=state.stored.filter(kind=>!isRetiredTradeBuilding(kind)&&topviewItems[kind].group===group).length
   return <button key={group} aria-label={label} aria-pressed={category===group} onClick={()=>onCategory(group)}><FarmCategoryIcon kind={group==='건물'?'building':group==='동물'?'animal':'decoration'}/><span>{label}</span><FarmCountBadge count={count} label={`${label} 보관`}/></button>
  })}</FarmToolPanel>
}
