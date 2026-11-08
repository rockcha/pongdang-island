import {useFarmQuantity} from './use-farm-quantity'
import {waterwheelDuration} from './waterwheel'
import {farmDuration} from './farm-duration'
import {farmWorkshops} from './workshop-catalog'
import {useState} from 'react'
import {ChefHat,Flower2,Scissors} from 'lucide-react'
import {farmRecipes,recipesForBuilding,recipeBatchLimit,recipeOutput,type ProcessingBuilding,type RecipeId} from './food-catalog'
import {farmGoods,type FarmSimAction,type FarmSimulation} from './farm-simulation'
import {FarmItemPicker} from './item-picker'
import {FarmGoodIcon} from './farm-good-icon'
import {MaterialRequirements} from './material-requirements'
import {FarmProductHeading} from './product-heading'

export function ProcessingWorkshop({buildingId,kind,simulation,now,onAction,maxOutput=2,waterwheelBonus=0}:{buildingId:number;maxOutput?:number;waterwheelBonus?:number;kind:ProcessingBuilding;simulation:FarmSimulation;now:number;onAction:(action:FarmSimAction)=>void}){
 const [readyOnly,setReadyOnly]=useState(true),[choice,setSelected]=useState<RecipeId|undefined>()
 const filterRecipes=kind==='kitchen'||kind==='advancedKitchen'
 const allChoices=recipesForBuilding(kind,simulation.unlockedAnimals),choices=filterRecipes&&readyOnly?allChoices.filter(id=>recipeBatchLimit(simulation.inventory,id,maxOutput)>0):allChoices,selected=choice&&choices.includes(choice)?choice:choices[0]
 const job=simulation.processingJobs[buildingId],isApiary=kind==='apiary',isTextile=kind==='textileMill'||kind==='sewingWorkshop'
 if(job){
  const remaining=Math.max(0,Math.ceil((job.readyAt-now)/1000)),progress=Math.min(100,Math.max(0,(now-job.startedAt)/(job.readyAt-job.startedAt)*100))
  return <section className="farm-cooking-job" aria-label="가공 진행">
   <div className={`farm-cooking-art ${remaining?'is-cooking':''}`}><FarmGoodIcon good={job.recipe}/><span>{remaining?(isApiary?<Flower2 size={19}/>:isTextile?<Scissors size={19}/>:<ChefHat size={19}/>):<span>✓</span>}</span></div>
   <h3>{farmGoods[job.recipe].name} <span>×{job.quantity}</span></h3><p>{isApiary?(remaining?`벌들이 꿀을 모으고 있어요 · ${farmDuration(remaining)}`:'달콤한 꿀을 수확할 수 있어요.'):(remaining?`${farmDuration(remaining)} 후 완성돼요`:'완성됐어요. 가공품을 받아주세요.')}</p>
   <div className="farm-sim-progress" role="progressbar" aria-label={`${farmGoods[job.recipe].name} 제작 진행`} aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100}><i style={{width:progress+'%'}}/></div>
   <p className="farm-cooking-note">{isApiary?'꿀을 수확하면 다시 생산을 시작할 수 있어요. 수확한 꿀은 창고에 보관돼요.':'재료는 제작 시작 시 모두 사용해요. 제작이 끝나면 한 번에 받아주세요.'}</p>
   <button className="farm-sim-primary" disabled={remaining>0} onClick={()=>onAction({type:'collectCraft'})}>{isApiary?(remaining?'꿀을 모으고 있어요…':'꿀 수확하기'):(remaining?'만들고 있어요…':'가공품 받기')}</button>
  </section>
 }
 return <div className="farm-workbench">
  <div className="farm-recipe-chooser">
   {filterRecipes&&<label className="farm-recipe-filter"><input type="checkbox" checked={readyOnly} onChange={event=>setReadyOnly(event.target.checked)}/>제작 가능한 요리만</label>}
   {selected?<FarmItemPicker items={choices} value={selected} onChange={setSelected} label={farmWorkshops[kind].pickerLabel} owned={id=>simulation.inventory[id]} detail={id=>farmDuration(farmRecipes[id].seconds)} status={id=>recipeBatchLimit(simulation.inventory,id,maxOutput)>0?'ready':'missing'}/>:<p className="farm-sim-caption">지금 제작 가능한 상품이 없어요. 체크를 해제하면 전체 제작법을 볼 수 있어요.</p>}
  </div>
  {selected&&<RecipeCard waterwheelBonus={waterwheelBonus} key={`${buildingId}-${selected}-${maxOutput}`} maxOutput={maxOutput} id={selected} inventory={simulation.inventory} onAction={onAction}/>}
 </div>
}

function RecipeCard({id,inventory,onAction,maxOutput,waterwheelBonus}:{waterwheelBonus:number;maxOutput:number;id:RecipeId;inventory:FarmSimulation['inventory'];onAction:(action:FarmSimAction)=>void}){
 const {quantity,setQuantity,quantityInput,quantityValid}=useFarmQuantity(1),recipe=farmRecipes[id],max=recipeBatchLimit(inventory,id,maxOutput),amount=max?Math.min(max,Math.max(1,quantity)):1,item=farmGoods[id],output=recipeOutput(id)
 const enough=quantityValid&&max>0&&recipe.ingredients.every(i=>inventory[i.good]>=i.quantity*amount)
 return <article className="farm-recipe-card" aria-label={`${item.name} 제작법`}>
  <FarmProductHeading good={id} seconds={waterwheelDuration(recipe.seconds*Math.ceil(amount*output/2),waterwheelBonus)}/>
  {id==='honey'&&<p className="farm-sim-caption">재료: 필요 없음. 벌들이 꿀을 모아요. 한 번에 최대 {maxOutput}개를 생산해요.</p>}
  {output>1&&<p className="farm-sim-caption">1회 제작으로 {item.name} {output}개를 만들어요.</p>}
  <MaterialRequirements items={recipe.ingredients.map(ingredient=>({id:ingredient.good,name:farmGoods[ingredient.good].name,owned:inventory[ingredient.good],required:ingredient.quantity*amount,icon:<FarmGoodIcon good={ingredient.good}/>}))}/>
  <p className="farm-sim-caption farm-recipe-summary">생산: {item.name} {amount*output}개 · 소요 시간: {farmDuration(waterwheelDuration(recipe.seconds*Math.ceil(amount*output/2),waterwheelBonus))} · 최대 {maxOutput}개</p>
  <div className="farm-recipe-controls"><div><button aria-label={`${item.name} 제작 수량 줄이기`} disabled={!quantityValid||amount<=1||!max} onClick={()=>setQuantity(amount-1)}>−</button><input {...quantityInput(max)} aria-label={`${item.name} 제작 수량`} disabled={!max} /><button aria-label={`${item.name} 제작 수량 늘리기`} disabled={!quantityValid||!max||amount>=max} onClick={()=>setQuantity(amount+1)}>+</button><button disabled={!max} onClick={()=>setQuantity(max)}>최대</button></div><button className="farm-recipe-submit" aria-label={`${item.name} 만들기`} disabled={!quantityValid||!enough} onClick={()=>onAction({type:'craft',recipe:id,quantity:amount})}>{!quantityValid?'수량을 입력해주세요':enough?`${amount*output}개 만들기`:'재료 부족'}</button></div>
 </article>
}
