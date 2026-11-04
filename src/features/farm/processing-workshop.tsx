import {useState} from 'react'
import {ChefHat,Clock3} from 'lucide-react'
import {farmRecipes,recipeIds,recipeBatchLimit,type ProcessingBuilding,type RecipeId} from './food-catalog'
import {farmGoods,type FarmSimAction,type FarmSimulation} from './farm-simulation'
import {FarmItemPicker} from './item-picker'
import {FarmGoodIcon} from './farm-good-icon'

export function ProcessingWorkshop({buildingId,kind,simulation,now,onAction}:{buildingId:number;kind:ProcessingBuilding;simulation:FarmSimulation;now:number;onAction:(action:FarmSimAction)=>void}){
 const choices=recipeIds.filter(id=>farmRecipes[id].building===kind),[selected,setSelected]=useState<RecipeId>(choices[0])
 const job=simulation.processingJobs[buildingId]
 if(job){
  const remaining=Math.max(0,Math.ceil((job.readyAt-now)/1000)),progress=Math.min(100,Math.max(0,(now-job.startedAt)/(job.readyAt-job.startedAt)*100))
  return <section className="farm-cooking-job" aria-label="가공 진행">
   <div className={`farm-cooking-art ${remaining?'is-cooking':''}`}><FarmGoodIcon good={job.recipe}/><span>{remaining?<ChefHat size={19}/>:<span>✓</span>}</span></div>
   <h3>{farmGoods[job.recipe].name} <span>×{job.quantity}</span></h3><p>{remaining?`${remaining}초 후 맛있게 완성돼요`:'완성됐어요. 가공품을 받아주세요.'}</p>
   <div className="farm-sim-progress" role="progressbar" aria-label={`${farmGoods[job.recipe].name} 제작 진행`} aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100}><i style={{width:progress+'%'}}/></div>
   <p className="farm-cooking-note">재료는 제작을 시작할 때 사용했어요. 이 건물의 작업이 끝나면 다음 생산을 시작할 수 있어요.</p>
   <button className="farm-sim-primary" disabled={remaining>0} onClick={()=>onAction({type:'collectCraft'})}>{remaining?'만들고 있어요…':'가공품 받기'}</button>
  </section>
 }
 return <><FarmItemPicker items={choices} value={selected} onChange={setSelected} label="만들 가공품"/><RecipeCard key={selected} id={selected} inventory={simulation.inventory} onAction={onAction}/></>
}

function RecipeCard({id,inventory,onAction}:{id:RecipeId;inventory:FarmSimulation['inventory'];onAction:(action:FarmSimAction)=>void}){
 const [quantity,setQuantity]=useState(1),recipe=farmRecipes[id],max=recipeBatchLimit(inventory,id),amount=max?Math.min(max,Math.max(1,quantity)):1,item=farmGoods[id]
 return <article className="farm-recipe-card" aria-label={`${item.name} 제작법`}>
  <header><FarmGoodIcon good={id}/><div><h3>{item.name}</h3><p>판매가 {item.price} G</p></div><span><Clock3 size={12}/>{recipe.seconds}초</span></header>
  <div className="farm-recipe-ingredients">{recipe.ingredients.map(ingredient=>{
   const needed=ingredient.quantity*amount,enough=inventory[ingredient.good]>=needed
   return <div key={ingredient.good} data-enough={enough}><FarmGoodIcon good={ingredient.good}/><div><strong>{farmGoods[ingredient.good].name} ×{needed}</strong><small>보유 {inventory[ingredient.good]}개</small></div></div>
  })}</div>
  <div className="farm-recipe-controls"><div><button aria-label={`${item.name} 제작 수량 줄이기`} disabled={amount<=1||!max} onClick={()=>setQuantity(amount-1)}>−</button><input type="number" inputMode="numeric" aria-label={`${item.name} 제작 수량`} min={1} max={Math.max(1,max)} value={amount} disabled={!max} onChange={event=>setQuantity(Math.min(max,Math.max(1,Math.floor(Number(event.target.value)||1))))}/><button aria-label={`${item.name} 제작 수량 늘리기`} disabled={!max||amount>=max} onClick={()=>setQuantity(amount+1)}>+</button><button disabled={!max} onClick={()=>setQuantity(max)}>최대</button></div><button className="farm-recipe-submit" aria-label={`${item.name} 만들기`} disabled={!max} onClick={()=>onAction({type:'craft',recipe:id,quantity:amount})}>{max?`${amount}개 만들기`:'재료 부족'}</button></div>
 </article>
}
