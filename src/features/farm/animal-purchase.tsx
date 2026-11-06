import {useState} from 'react'
import {Clock3,PawPrint} from 'lucide-react'
import {farmAnimals,farmAnimalKinds,ANIMAL_PURCHASE_SECONDS,type FarmAnimal} from './animal-catalog'
import {farmGoods,farmAnimalHousing,type FarmSimAction} from './farm-simulation'
import type {TopviewState} from './topview-model'
import {TopviewArt} from './topview-art'
import {FarmGoodIcon} from './farm-good-icon'

export function FarmAnimalPurchase({buildingId,kind,state,now,onAction}:{buildingId:number;kind:'barn'|'coop';state:TopviewState;now:number;onAction:(action:FarmSimAction)=>void}){
 const [selected,setSelected]=useState<FarmAnimal>(kind==='barn'?'cow':'chicken'),job=state.simulation.animalPurchaseJobs[buildingId]
 if(job){
  const animal=farmAnimals[job.animal],remaining=Math.max(0,Math.ceil((job.readyAt-now)/1000))
  return <section className="farm-animal-purchase"><AnimalPurchaseSummary animal={job.animal} state={state}/><div className="farm-animal-purchase-content farm-sim-feature"><div className="farm-animal-preparing"><TopviewArt kind={job.animal}/></div><h3>{remaining?`${animal.name} 준비 중`:'동물 준비 완료!'}</h3><div className="farm-sim-progress" role="progressbar" aria-label="동물 준비 진행" aria-valuenow={Math.round(Math.min(100,(now-job.startedAt)/(ANIMAL_PURCHASE_SECONDS*10)))} aria-valuemin={0} aria-valuemax={100}><i style={{width:`${Math.min(100,(now-job.startedAt)/(ANIMAL_PURCHASE_SECONDS*10))}%`}}/></div><p>{remaining?`${remaining}초 후 받을 수 있어요.`:'보관함으로 받은 뒤 빈 땅에 배치해주세요.'}</p></div><footer className="farm-animal-purchase-footer"><button className="farm-sim-primary" disabled={remaining>0} onClick={()=>onAction({type:'completeAnimalPurchase'})}>{remaining?'동물 준비 중…':'보관함으로 받기'}</button></footer></section>
 }
 const animal=farmAnimals[selected],housing=farmAnimalHousing(state,selected),choices=farmAnimalKinds.filter(id=>farmAnimals[id].housing===kind)
 return <section className="farm-animal-purchase">
  <div className="farm-animal-purchase-content">
   <AnimalPurchaseSummary animal={selected} state={state}/>
   <div className="farm-animal-choices" role="group" aria-label="구매할 동물">{choices.map(id=><button key={id} aria-label={`${farmAnimals[id].name} 선택`} aria-pressed={id===selected} onClick={()=>setSelected(id)}><TopviewArt kind={id}/><strong>{farmAnimals[id].name}</strong><span className="farm-animal-card-meta"><small className="farm-animal-price">{farmAnimals[id].price.toLocaleString()} G</small><small className="farm-animal-time" aria-label={`${farmAnimals[id].name} 1회 생산 시간 ${farmAnimals[id].seconds}초`}><Clock3 size={12} aria-hidden="true"/>생산 {farmAnimals[id].seconds}초</small></span></button>)}</div>
   <section className="farm-animal-unlocks" aria-label="생산 가능한 상품">
    <strong>생산품</strong>
    <div className="farm-animal-products"><div><FarmGoodIcon good={animal.product}/><div><strong>{farmGoods[animal.product].name}</strong><small>기본 생산 · 매번 1개</small></div></div></div>
    {animal.product==='wool'&&<p className="farm-sim-caption">양털은 창고에 보관해요. 활용처는 준비 중이에요.</p>}
   </section>
  </div>
  <footer className="farm-animal-purchase-footer"><p>구매 후 준비 {ANIMAL_PURCHASE_SECONDS}초 · 보관함에서 배치</p><button className="farm-sim-primary" disabled={housing.total>=housing.capacity||state.gold<animal.price} onClick={()=>onAction({type:'animal',animal:selected})}>{animal.name} 구매 · {animal.price.toLocaleString()} G</button></footer>
 </section>
}

function AnimalPurchaseSummary({animal,state}:{animal:FarmAnimal;state:TopviewState}){
 const housing=farmAnimalHousing(state,animal),full=housing.total>=housing.capacity
 return <div className="farm-animal-summary" role="group" aria-label="전체 동물 정원"><div data-full={full||undefined} aria-label={`사육 정원 ${housing.total} / ${housing.capacity}마리 · 보관·준비 중 포함`}><span><PawPrint size={14}/>전체 동물 정원</span><strong>{housing.total}<i> / </i>{housing.capacity}<small>마리</small></strong></div><div className="farm-animal-capacity-action"><span>{full?'정원이 가득 찼어요':'모든 동물이 함께 쓰는 정원이에요'}</span></div></div>
}
