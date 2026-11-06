import {waterwheelBonusMinutes,waterwheelDuration} from './waterwheel'
import {useState} from 'react'
import {farmAnimalKinds,farmAnimals,type FarmAnimal} from './animal-catalog'
import {butcherRecipes,BUTCHER_SECONDS} from './butcher-catalog'
import {farmDuration} from './farm-duration'
import {canStoreFarmGoods,farmGoods,type FarmSimAction} from './farm-simulation'
import type {TopviewState} from './topview-model'
import {TopviewArt} from './topview-art'
import {FarmGoodIcon} from './farm-good-icon'
import {MaterialRequirements} from './material-requirements'
import './butcher-workshop.css'

export function ButcherWorkshop({state,buildingId,now,onAction}:{state:TopviewState;buildingId:number;now:number;onAction:(action:FarmSimAction)=>void}){
 const [animal,setAnimal]=useState<FarmAnimal>('cow'),[quantity,setQuantity]=useState(1)
 const building=state.objects.find(o=>o.id===buildingId),bonus=building?waterwheelBonusMinutes(state,building):0
 const job=state.simulation.butcherJobs?.[buildingId]
 if(job){const remaining=Math.max(0,(job.readyAt-now)/1000);return <section className="farm-sim-feature"><FarmGoodIcon good={job.good}/><h3>{farmGoods[job.good].name} ×{job.quantity}</h3><p>{remaining?`${farmDuration(remaining)} 후 가공이 끝나요.`:'가공이 끝났어요.'}</p><p className="farm-sim-caption">투입한 동물은 가공 시작 시 사용됐어요.</p><button className="farm-sim-primary" disabled={remaining>0} onClick={()=>onAction({type:'collectMeat'})}>고기 받기</button></section>}
 const count=(kind:FarmAnimal)=>state.stored.filter(item=>item===kind).length
 const available=count(animal),amount=Math.min(quantity,Math.max(1,available)),recipe=butcherRecipes[animal],output=amount*recipe.output
 const canConvert=available>0&&canStoreFarmGoods(state,[{good:recipe.good,quantity:output}])
 return <section className="farm-butcher" aria-label="동물 고기 가공">
  <p className="farm-sim-caption">재료: 보관함의 동물</p>
  <div className="farm-butcher-animals">{farmAnimalKinds.map(kind=><button key={kind} aria-label={`${farmAnimals[kind].name} 선택`} aria-pressed={kind===animal} onClick={()=>{setAnimal(kind);setQuantity(1)}}><TopviewArt kind={kind}/><strong>{farmAnimals[kind].name}</strong><small>보관 {count(kind)}마리</small><span className="farm-craft-badge" data-status={count(kind)>0?'ready':'missing'}>{count(kind)>0?'가공 가능':'보관 동물 없음'}</span><span>사용: 1마리 · 생산: {farmGoods[butcherRecipes[kind].good].name} {butcherRecipes[kind].output}개</span></button>)}</div>
  <div className="farm-sim-item"><FarmGoodIcon good={recipe.good}/><div><strong>생산: {farmGoods[recipe.good].name} {output}개</strong><small>{farmAnimals[animal].name} {amount}마리 사용 · 소요 시간: {farmDuration(waterwheelDuration(BUTCHER_SECONDS*amount,bonus))}</small></div></div>
  <MaterialRequirements blocked={available>0&&!canConvert?'창고 공간 부족':undefined} items={[{id:animal,name:`보관함의 ${farmAnimals[animal].name}`,owned:available,required:amount,unit:'마리',icon:<TopviewArt kind={animal}/>}]} />
  <div className="farm-butcher-quantity"><button aria-label="투입 동물 수 줄이기" disabled={amount<=1} onClick={()=>setQuantity(amount-1)}>−</button><span>{amount}마리</span><button aria-label="투입 동물 수 늘리기" disabled={amount>=available} onClick={()=>setQuantity(amount+1)}>＋</button></div>
  <p className="farm-sim-caption">넣은 동물은 사라져요. 고기는 창고의 가공품에 보관돼요.</p>
  <button className="farm-sim-primary" disabled={!canConvert} onClick={()=>onAction({type:'butcher',animal,quantity:amount})}>{!available?'보관함에 동물이 없어요':!canConvert?'창고 공간 부족':`${farmAnimals[animal].name} ${amount}마리 넣기 · ${farmGoods[recipe.good].name} ${output}개`}</button>
 </section>
}
