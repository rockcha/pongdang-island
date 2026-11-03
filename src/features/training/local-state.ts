import {companions,companionDefinition,TRAINING_MAX_LEVEL,TRAINING_XP,trainingChances,xpForLevel} from './catalog'

export type LocalCompanion={id:string;speciesId:string;tags:string[];tankId:string|null;trained:boolean;level:number;xp:number}
export type TrainingSave={version:1;shards:number;units:LocalCompanion[]}
export function newTrainingSave():TrainingSave{return {version:1,shards:100,units:companions.map(definition=>({id:`trial-${definition.id}`,speciesId:definition.id,tags:['bond'],tankId:null,trained:false,level:1,xp:0}))}}
export function isEligible(unit:LocalCompanion){return unit.tags.includes('bond')&&unit.tankId===null}
export function trainCompanion(save:TrainingSave,id:string,random=Math.random):{save:TrainingSave;success:boolean;message:string}{
 const unit=save.units.find(item=>item.id===id)
 if(!unit||!isEligible(unit))return {save,success:false,message:'보관함에 있는 유대 개체를 선택해주세요.'}
 if(unit.trained&&unit.level>=TRAINING_MAX_LEVEL)return {save,success:false,message:'최고 레벨에 도달했어요.'}
 if(save.shards<1)return {save,success:false,message:'유대의 조각이 부족해요.'}
 const success=unit.trained||random()*100<trainingChances[companionDefinition(unit.speciesId).rarity]
 const next={...save,shards:save.shards-1,units:save.units.map(item=>({...item,tags:[...item.tags]}))},target=next.units.find(item=>item.id===id)!
 if(!success)return {save:next,success:false,message:'조금 더 가까워질 시간이 필요해요. 개체는 그대로 보관돼요.'}
 if(!target.trained){target.trained=true;return {save:next,success:true,message:'유대가 이어졌어요! 이제 함께 연습할 수 있어요.'}}
 target.xp+=TRAINING_XP
 while(target.level<TRAINING_MAX_LEVEL&&target.xp>=xpForLevel(target.level)){target.xp-=xpForLevel(target.level);target.level++}
 if(target.level===TRAINING_MAX_LEVEL)target.xp=0
 return {save:next,success:true,message:target.level>unit.level?`Lv. ${target.level}로 성장했어요!`:`경험치 ${TRAINING_XP}를 얻었어요.`}
}
/** All values here are operator-only fixtures, never a copy of server inventory or currency. */
export const trainingStorageKey=(accountId:string)=>`pongdang:training-trial:v1:${accountId}`
export function restoreTrainingSave(value:string|null):TrainingSave{
 const initial=newTrainingSave()
 try{
  const saved=JSON.parse(value??'null') as TrainingSave|null
  if(saved?.version!==1||!Number.isSafeInteger(saved.shards)||saved.shards<0||saved.shards>100000||!Array.isArray(saved.units))return initial
  return {version:1,shards:saved.shards,units:initial.units.map(fixture=>{
   const unit=saved.units.find(item=>item?.id===fixture.id)
   if(!unit||unit.speciesId!==fixture.speciesId||typeof unit.trained!=='boolean'||!Number.isInteger(unit.level)||unit.level<1||unit.level>TRAINING_MAX_LEVEL||!Number.isInteger(unit.xp)||unit.xp<0||unit.xp>=xpForLevel(unit.level)||!Array.isArray(unit.tags))return fixture
   return {...fixture,trained:unit.trained,level:unit.trained?unit.level:1,xp:unit.trained&&unit.level<TRAINING_MAX_LEVEL?unit.xp:0,tankId:unit.tankId===null?null:'trial-aquarium'}
  })}
 }catch{return initial}
}
