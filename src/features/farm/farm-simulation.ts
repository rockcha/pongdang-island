import type {FarmTool,TopviewState} from './topview-model'

// Local farm prototype. This state never reads or writes a player's real inventory or wallet.

export const farmGoods={wheatSeed:{name:'밀 종자',icon:'🌱',price:10},potatoSeed:{name:'감자 종자',icon:'🌱',price:20},wheat:{name:'밀',icon:'🌾',price:25},potato:{name:'감자',icon:'🥔',price:45},flour:{name:'밀가루',icon:'🌾',price:40},egg:{name:'달걀',icon:'🥚',price:35},milk:{name:'우유',icon:'🥛',price:50}} as const
export type FarmGood=keyof typeof farmGoods
export type CropKind='wheat'|'potato'
export type FarmSimulation={inventory:Record<FarmGood,number>;potatoUnlocked:boolean;cropJobs:Record<number,{crop:CropKind;readyAt:number}>;animalJobs:Record<number,number>;millJob:{quantity:number;readyAt:number}|null}
export function initialFarmSimulation():FarmSimulation{return {inventory:{wheatSeed:4,potatoSeed:0,wheat:12,potato:0,flour:0,egg:0,milk:0},potatoUnlocked:false,cropJobs:{},animalJobs:{},millJob:null}}
export function farmLimits(state:TopviewState){
 const count=(kind:FarmTool)=>state.objects.filter(o=>o.kind===kind).length
 return {plots:4+count('office')*4,animals:2+count('livestock')*2,usedPlots:count('plot'),usedAnimals:count('chicken')+count('cow')+count('sheep')}
}
export function farmPlacementError(state:TopviewState,kind:FarmTool){
 const limits=farmLimits(state)
 if(kind==='plot'&&limits.usedPlots>=limits.plots)return '텃밭 한도가 찼어요. 농지 관리소를 추가해주세요.'
 if(['chicken','cow','sheep'].includes(kind)&&limits.usedAnimals>=limits.animals)return '동물 한도가 찼어요. 축산 관리소를 추가해주세요.'
 if(kind==='chicken'&&!state.objects.some(o=>o.kind==='coop'))return '닭장을 먼저 배치해주세요.'
 if(kind==='cow'&&!state.objects.some(o=>o.kind==='barn'))return '외양간을 먼저 배치해주세요.'
 return null
}
export type FarmSimAction=
 |{type:'seed';good:'wheatSeed'|'potatoSeed';quantity:number}
 |{type:'sell';good:FarmGood;quantity:number}
 |{type:'research'}|{type:'mill';quantity:number}|{type:'collectFlour'}
 |{type:'plant';crop:CropKind}|{type:'harvest'}
 |{type:'animal';animal:'cow'|'chicken'}|{type:'feed'}|{type:'collectAnimal'}
export function simulateFarm(state:TopviewState,sourceId:number,action:FarmSimAction,now:number):{state:TopviewState;message:string;place?:FarmTool}{
 const source=state.objects.find(o=>o.id===sourceId),sim=state.simulation
 const reject=(message:string)=>({state,message})
 if(!source)return reject('시설을 먼저 배치해주세요.')
 const inventory={...sim.inventory},next:FarmSimulation={...sim,inventory,cropJobs:{...sim.cropJobs},animalJobs:{...sim.animalJobs}}
 let gold=state.gold,message='',place:FarmTool|undefined
 if('quantity'in action&&(!Number.isSafeInteger(action.quantity)||action.quantity<1))return reject('수량을 확인해주세요.')
 switch(action.type){
  case 'seed':{
   if(source.kind!=='store')return reject('종자는 농산물 상점에서 구매해요.')
   if(action.good==='potatoSeed'&&!sim.potatoUnlocked)return reject('종자 연구소에서 감자를 먼저 연구해주세요.')
   const cost=farmGoods[action.good].price*action.quantity
   if(cost>gold)return reject('테스트 골드가 부족해요.')
   gold-=cost;inventory[action.good]+=action.quantity;message=`${farmGoods[action.good].name} ${action.quantity}개를 구매했어요.`;break
  }
  case 'sell':{
   const allowed=source.kind==='store'?['wheat','potato','egg','milk']:source.kind==='processed'?['flour']:[]
   if(!allowed.includes(action.good))return reject('이 상점에서 판매할 수 없는 물품이에요.')
   if(inventory[action.good]<action.quantity)return reject('보유 수량이 부족해요.')
   inventory[action.good]-=action.quantity;gold+=farmGoods[action.good].price*action.quantity;message=`${farmGoods[action.good].name} ${action.quantity}개를 판매했어요.`;break
  }
  case 'research':{
   if(source.kind!=='lab')return reject('종자 연구소를 이용해주세요.')
   if(sim.potatoUnlocked)return reject('이미 감자를 연구했어요.')
   if(gold<300)return reject('연구에는 300 테스트 골드가 필요해요.')
   gold-=300;next.potatoUnlocked=true;message='감자 연구 완료! 농산물 상점에서 감자 종자를 구매할 수 있어요.';break
  }
  case 'plant':{
   if(source.kind!=='plot'||sim.cropJobs[sourceId])return reject('비어 있는 텃밭을 골라주세요.')
   if(action.crop==='potato'&&!sim.potatoUnlocked)return reject('감자를 먼저 연구해주세요.')
   const seed=action.crop==='wheat'?'wheatSeed':'potatoSeed'
   if(inventory[seed]<1)return reject('종자가 없어요. 농산물 상점에서 구매해주세요.')
   inventory[seed]--;next.cropJobs[sourceId]={crop:action.crop,readyAt:now+(action.crop==='wheat'?10000:15000)};message='종자를 심었어요.';break
  }
  case 'harvest':{
   const job=sim.cropJobs[sourceId]
   if(source.kind!=='plot'||!job||job.readyAt>now)return reject('아직 수확할 수 없어요.')
   const quantity=job.crop==='wheat'?3:2;inventory[job.crop]+=quantity;delete next.cropJobs[sourceId];message=`${farmGoods[job.crop].name} ${quantity}개를 수확했어요.`;break
  }
  case 'mill':{
   if(source.kind!=='mill')return reject('제분소를 이용해주세요.')
   if(sim.millJob)return reject('진행 중인 제분을 먼저 수령해주세요.')
   if(inventory.wheat<action.quantity)return reject('밀이 부족해요.')
   inventory.wheat-=action.quantity;next.millJob={quantity:action.quantity,readyAt:now+10000};message='제분을 시작했어요. 10초 후 수령할 수 있어요.';break
  }
  case 'collectFlour':{
   if(source.kind!=='mill'||!sim.millJob||sim.millJob.readyAt>now)return reject('아직 제분이 끝나지 않았어요.')
   inventory.flour+=sim.millJob.quantity;next.millJob=null;message='밀가루를 수령했어요.';break
  }
  case 'animal':{
   if(source.kind!==(action.animal==='cow'?'barn':'coop'))return reject('해당 동물의 시설을 이용해주세요.')
   const error=farmPlacementError(state,action.animal)
   if(error)return reject(error)
   const limits=farmLimits(state),storedAnimals=state.stored.filter(k=>['cow','chicken','sheep'].includes(k)).length
   if(limits.usedAnimals+storedAnimals>=limits.animals)return reject('보관 중인 동물을 포함해 동물 한도가 찼어요.')
   const price=action.animal==='cow'?800:300
   if(gold<price)return reject('테스트 골드가 부족해요.')
   gold-=price;place=action.animal;message='동물을 구매했어요. 원하는 위치에 배치해주세요.';break
  }
  case 'feed':{
   if(!['cow','chicken'].includes(source.kind)||sim.animalJobs[sourceId])return reject('지금은 먹이를 줄 수 없어요.')
   if(inventory.wheat<1)return reject('먹이로 줄 밀 1개가 필요해요.')
   inventory.wheat--;next.animalJobs[sourceId]=now+10000;message='먹이를 줬어요. 10초 후 생산물을 받을 수 있어요.';break
  }
  case 'collectAnimal':{
   if(!['cow','chicken'].includes(source.kind)||!sim.animalJobs[sourceId]||sim.animalJobs[sourceId]>now)return reject('아직 생산물이 준비되지 않았어요.')
   inventory[source.kind==='cow'?'milk':'egg']++;delete next.animalJobs[sourceId];message='생산물을 받았어요.';break
  }
 }
 return {state:{...state,gold,simulation:next,stored:place?[...state.stored,place]:state.stored},message,place}
}
