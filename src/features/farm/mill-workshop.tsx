import {useState} from 'react'
import {millProducts,millRecipes,type MillProduct} from './food-catalog'
import {farmGoods,type FarmSimulation,type FarmSimAction} from './farm-simulation'
import {FarmItemPicker} from './item-picker'
import {FarmGoodIcon} from './farm-good-icon'
import {FarmProductHeading} from './product-heading'

export function MillWorkshop({buildingId,simulation,now,onAction}:{buildingId:number;simulation:FarmSimulation;now:number;onAction:(action:FarmSimAction)=>void}){
 const [selected,setSelected]=useState<MillProduct>('flour'),[quantity,setQuantity]=useState(1),job=simulation.millJobs[buildingId]
 if(job){
  const product=job.product??'flour',recipe=millRecipes[product],remaining=Math.max(0,Math.ceil((job.readyAt-now)/1000)),progress=Math.min(100,Math.max(0,(now-job.startedAt)/(job.readyAt-job.startedAt)*100)),label=`${farmGoods[recipe.crop].name} ${job.quantity*recipe.input}개 → ${farmGoods[product].name} ${job.quantity*recipe.output}개`
  return <div className="farm-sim-feature"><FarmGoodIcon good={product}/><h3>{label}</h3><div className="farm-sim-progress" role="progressbar" aria-label={label} aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100}><i style={{width:`${progress}%`}}/></div><p>{remaining?`${remaining}초 남았어요`:'가공이 끝났어요.'}</p><button className="farm-sim-primary" disabled={remaining>0} onClick={()=>onAction({type:'collectFlour'})}>수령하기</button></div>
 }
 const milling=selected==='flour'||selected==='cornFlour',husking=selected==='rice'
 const recipe=millRecipes[selected],crop=recipe.crop,unlocked=simulation.unlockedCrops.includes(crop),max=unlocked?Math.min(Math.floor(2/recipe.output),Math.floor(simulation.inventory[crop]/recipe.input)):0,amount=Math.min(Math.max(1,quantity),max)
 return <><FarmItemPicker items={millProducts} value={selected} onChange={product=>{setSelected(product);setQuantity(1)}} label="만들 가공품" isLocked={product=>!simulation.unlockedCrops.includes(millRecipes[product].crop)}/><FarmProductHeading good={selected} seconds={recipe.seconds}/><p className="farm-sim-caption">{farmGoods[crop].name} {recipe.input}개로 {recipe.seconds}초 동안 {farmGoods[selected].name} {recipe.output}개를 만들어요.{!unlocked&&' 해당 작물을 먼저 연구해주세요.'}</p><div className="farm-sim-quantity-row"><div className="farm-sim-item"><FarmGoodIcon good={crop}/><div><strong>{farmGoods[crop].name} ×{Math.max(1,amount)*recipe.input}</strong><small>보유 {simulation.inventory[crop]}개</small></div></div><div className="farm-sim-quantity-controls"><button aria-label={`${farmGoods[crop].name} 수량 줄이기`} disabled={amount<=1} onClick={()=>setQuantity(amount-1)}>−</button><input type="number" aria-label={`${farmGoods[crop].name} 수량`} min={max?1:0} max={max} value={amount} disabled={!max} onChange={event=>setQuantity(Math.min(max,Math.max(1,Math.floor(Number(event.target.value)||1))))}/><button aria-label={`${farmGoods[crop].name} 수량 늘리기`} disabled={amount>=max} onClick={()=>setQuantity(amount+1)}>+</button><button disabled={!max} onClick={()=>setQuantity(max)}>전체</button><button className="farm-sim-submit" aria-label={milling?`${farmGoods[crop].name} 제분 시작`:husking?'벼 도정 시작':`${farmGoods[selected].name} 만들기`} disabled={!max} onClick={()=>onAction({type:'mill',product:selected,quantity:amount})}>{milling?'제분 시작':husking?'도정 시작':`${farmGoods[selected].name} 만들기`}</button></div></div></>
}
