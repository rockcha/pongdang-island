import {TopviewArt} from './topview-art'
import {useState} from 'react'
import {ArrowLeft,BookOpen,ChevronRight,Search} from 'lucide-react'
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog'
import {finishedFoods,farmRecipes,isRecipeId,millRecipes,millProducts,type MillProduct} from './food-catalog'
import {farmGoods,type FarmGood} from './farm-simulation'
import {farmCrops,isCropKind} from './crop-catalog'
import {farmAnimals,farmAnimalKinds,ANIMAL_PRODUCTION_OUTPUT} from './animal-catalog'
import {butcherRecipes,BUTCHER_SECONDS} from './butcher-catalog'
import {topviewItems,type FarmTool,type TopviewState} from './topview-model'
import {FarmGoodIcon} from './farm-good-icon'
import {FarmGold} from './farm-gold'
import {farmDuration} from './farm-duration'
import './cookbook.css'

export function FarmCookbook({state,onClose,onNavigate}:{state:TopviewState;onClose:()=>void;onNavigate?:(kind:FarmTool)=>void}){
 const [query,setQuery]=useState(''),[path,setPath]=useState<FarmGood[]>([])
 const selected=path.at(-1),foods=finishedFoods.filter(id=>farmGoods[id].name.includes(query.trim())).sort((a,b)=>farmGoods[a].price-farmGoods[b].price)
 const open=(good:FarmGood)=>setPath(previous=>[...previous,good])
 return <Dialog open onOpenChange={open=>{if(!open)onClose()}}><DialogContent className="farm-cookbook">
  <DialogHeader><DialogTitle><BookOpen size={20}/>요리 도감</DialogTitle><DialogDescription>요리부터 재료의 획득 방법까지 살펴보세요.</DialogDescription></DialogHeader>
  {selected?<>
   <nav className="farm-cookbook-nav"><button onClick={()=>setPath(p=>p.slice(0,-1))}><ArrowLeft size={16}/>{path.length>1?farmGoods[path[path.length-2]].name:'요리 목록'}</button>{path.length>1&&<button onClick={()=>setPath([])}>전체 요리</button>}</nav>
   <div className="farm-cookbook-detail" key={selected}>
    <header><FarmGoodIcon good={selected}/><div><h3>{farmGoods[selected].name}</h3><span>보유 {state.simulation.inventory[selected]}개</span>{finishedFoods.some(id=>id===selected)&&<p>개당 판매가 <FarmGold amount={farmGoods[selected].price}/></p>}</div></header>
    <Acquisition good={selected} state={state} onSelect={open} onNavigate={onNavigate}/>
   </div>
  </>:<>
   <label className="farm-cookbook-search"><Search size={17}/><input aria-label="요리 이름 검색" placeholder="요리 이름 검색" value={query} onChange={e=>setQuery(e.target.value)}/><span>{foods.length}종</span></label>
   <div className="farm-cookbook-grid">{foods.map(id=><button key={id} onClick={()=>open(id)} aria-label={`${farmGoods[id].name} 제작법`}><FarmGoodIcon good={id}/><strong>{farmGoods[id].name}</strong><FarmGold amount={farmGoods[id].price}/></button>)}{!foods.length&&<p>검색한 요리가 없어요.</p>}</div>
  </>}
 </DialogContent></Dialog>
}

function Acquisition({good,state,onSelect,onNavigate}:{good:FarmGood;state:TopviewState;onSelect:(good:FarmGood)=>void;onNavigate?:(kind:FarmTool)=>void}){
 if(isCropKind(good)){
  const crop=farmCrops[good],unlocked=state.simulation.unlockedCrops.includes(good)
  return <section><h4>밭에서 재배</h4><p>종자 상점에서 {crop.name} 종자를 구매해 밭에 심으세요.</p><p>성장 {farmDuration(crop.growSeconds)} · 한 칸에서 {crop.yield}개 수확</p>{!unlocked&&<p className="farm-cookbook-notice">먼저 연구소에서 종자를 연구해야 해요. 연구 {farmDuration(crop.researchSeconds)} · <FarmGold amount={crop.researchPrice}/></p>}<p>종자 1개 <FarmGold amount={crop.seedPrice}/> · 다 자란 뒤 24시간 안에 수확</p></section>
 }
 if(isRecipeId(good)){
  const recipe=farmRecipes[good]
  return <section><BuildingLink kind={recipe.building} state={state} onNavigate={onNavigate}/><p>1~2개 기준 {farmDuration(recipe.seconds)} · 수량이 늘면 시간이 길어져요.</p>{'animal'in recipe&&!state.simulation.unlockedAnimals?.includes(recipe.animal)&&<p className="farm-cookbook-notice">{farmAnimals[recipe.animal].name} 구매 후 제작법이 열려요.</p>}<h4>1개 제작에 필요한 재료</h4><Ingredients items={recipe.ingredients} onSelect={onSelect}/>{!recipe.ingredients.length&&<p>재료 없이 생산할 수 있어요. 양봉장에서 꿀 생산을 시작하세요.</p>}</section>
 }
 if(millProducts.includes(good as MillProduct)){
  const recipe=millRecipes[good as MillProduct]
  return <section><h4>제분소에서 가공</h4><BuildingLink kind="mill" state={state} onNavigate={onNavigate}/><p>1~2개 기준 {farmDuration(recipe.seconds)}</p><h4>1개 제작에 필요한 재료</h4><Ingredients items={[{good:recipe.crop,quantity:recipe.input}]} onSelect={onSelect}/></section>
 }
 const animals=farmAnimalKinds.filter(id=>farmAnimals[id].product===good)
 if(animals.length)return <section><h4>동물에게서 획득</h4>{animals.map(id=><div key={id}><p>{topviewItems[farmAnimals[id].housing].name}에서 {farmAnimals[id].name}을 구매하고 농장에 배치하세요.</p><p>밀 1개를 먹이면 {farmDuration(farmAnimals[id].seconds)} 후 {farmGoods[good].name} {ANIMAL_PRODUCTION_OUTPUT}개를 받을 수 있어요.</p></div>)}<Ingredients items={[{good:'wheat',quantity:1}]} onSelect={onSelect}/></section>
 const meatAnimals=farmAnimalKinds.filter(id=>butcherRecipes[id].good===good)
 if(meatAnimals.length)return <section><h4>{topviewItems.butcher.name}에서 획득</h4><BuildingLink kind="butcher" state={state} onNavigate={onNavigate}/><p>보관함의 동물을 사용해 가공해요. 사용한 동물은 소모됩니다.</p>{meatAnimals.map(id=><p key={id}>{topviewItems[farmAnimals[id].housing].name}에서 구매한 {farmAnimals[id].name} 1마리 → {farmGoods[good].name} {butcherRecipes[id].output}개 · {farmDuration(BUTCHER_SECONDS)}</p>)}</section>
 return <p>획득 방법을 준비 중이에요.</p>
}

function BuildingLink({kind,state,onNavigate}:{kind:FarmTool;state:TopviewState;onNavigate?: (kind:FarmTool)=>void}){
 const placed=state.objects.some(o=>o.kind===kind&&!o.constructionReadyAt),stored=state.stored.includes(kind),building=state.objects.some(o=>o.kind===kind&&o.constructionReadyAt)
 const label=placed?'이동하기':stored?'보관함에서 배치':building?'건설 중':'구매하기'
 return <div className="farm-cookbook-building"><span className="farm-cookbook-building-art"><TopviewArt kind={kind} compact/></span><div><strong>{topviewItems[kind].name}</strong><small>제작 건물</small></div><button disabled={!onNavigate||(!placed&&!stored&&building)} onClick={()=>onNavigate?.(kind)} aria-label={`${topviewItems[kind].name} ${label}`}>{label}<ChevronRight size={14}/></button></div>
}

function Ingredients({items,onSelect}:{items:readonly {good:FarmGood;quantity:number}[];onSelect:(good:FarmGood)=>void}){
 return <div className="farm-cookbook-ingredients">{items.map(item=><button key={item.good} onClick={()=>onSelect(item.good)} aria-label={`${farmGoods[item.good].name} 획득 방법`}><FarmGoodIcon good={item.good}/><span><strong>{farmGoods[item.good].name}</strong><small>재료: {item.quantity}개 필요</small></span><ChevronRight size={16}/></button>)}</div>
}
