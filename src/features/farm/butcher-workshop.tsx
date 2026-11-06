import {useState} from 'react'
import {farmAnimalKinds,farmAnimals,type FarmAnimal} from './animal-catalog'
import {butcherRecipes} from './butcher-catalog'
import {canStoreFarmGoods,farmGoods,type FarmSimAction} from './farm-simulation'
import type {TopviewState} from './topview-model'
import {TopviewArt} from './topview-art'
import {FarmGoodIcon} from './farm-good-icon'
import './butcher-workshop.css'

export function ButcherWorkshop({state,onAction}:{state:TopviewState;onAction:(action:FarmSimAction)=>void}){
 const [animal,setAnimal]=useState<FarmAnimal>('cow'),[quantity,setQuantity]=useState(1)
 const count=(kind:FarmAnimal)=>state.stored.filter(item=>item===kind).length
 const available=count(animal),amount=Math.min(quantity,Math.max(1,available)),recipe=butcherRecipes[animal],output=amount*recipe.output
 const canConvert=available>0&&canStoreFarmGoods(state,[{good:recipe.good,quantity:output}])
 return <section className="farm-butcher" aria-label="동물 고기 가공">
  <p className="farm-sim-caption">보관함에서 넣을 동물</p>
  <div className="farm-butcher-animals">{farmAnimalKinds.map(kind=><button key={kind} aria-label={`${farmAnimals[kind].name} 선택`} aria-pressed={kind===animal} onClick={()=>{setAnimal(kind);setQuantity(1)}}><TopviewArt kind={kind}/><strong>{farmAnimals[kind].name}</strong><small>보관 {count(kind)}마리</small><span>1마리 → {farmGoods[butcherRecipes[kind].good].name} {butcherRecipes[kind].output}개</span></button>)}</div>
  <div className="farm-sim-item"><FarmGoodIcon good={recipe.good}/><div><strong>{farmGoods[recipe.good].name} × {output}</strong><small>{farmAnimals[animal].name} {amount}마리 사용 · 즉시 가공</small></div></div>
  <div className="farm-butcher-quantity"><button aria-label="투입 동물 수 줄이기" disabled={amount<=1} onClick={()=>setQuantity(amount-1)}>−</button><span>{amount}마리</span><button aria-label="투입 동물 수 늘리기" disabled={amount>=available} onClick={()=>setQuantity(amount+1)}>＋</button></div>
  <p className="farm-sim-caption">넣은 동물은 사라져요. 고기는 창고의 가공품에 보관돼요.</p>
  <button className="farm-sim-primary" disabled={!canConvert} onClick={()=>onAction({type:'butcher',animal,quantity:amount})}>{!available?'보관함에 동물이 없어요':!canConvert?'창고 공간 부족':`${farmAnimals[animal].name} ${amount}마리 넣기 · ${farmGoods[recipe.good].name} ${output}개`}</button>
 </section>
}
