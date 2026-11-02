import {useRef,useState} from 'react'
import {ExplorationPlay} from './verified-exploration-game'
import {applyExplorationAction,newExplorationModel} from './server-engine'
import type {ExplorationReceipt,ExplorationRequest} from './reward-api'
import {roomTypes,type RoomTypeId} from './room-preview'
import {regularMonsters,explorationMonsters,type MonsterId} from './monster-catalog'
import {requiredDoorRoom} from './run-state'
import {randomId} from '@/lib/random-id'
import {explorationWeapons} from './weapon-catalog'
import {shamanSpells} from './shaman-stock'
const testMonsters=explorationMonsters.filter(monster=>monster.tier!=='boss'||['golden-scales-maaken','black-sun-aker'].includes(monster.id))

/** A local session of the real engine, with test supplies and room/monster overrides. Never pays rewards. */
export function TestExplorationGame({nickname,avatarPath,onLeave}:{nickname:string;avatarPath?:string|null;onLeave:()=>void}){
 const [receipt,setReceipt]=useState<ExplorationReceipt>(()=>{
  const model=newExplorationModel()
  model.state={...model.state,gold:100000,potions:{health:10,mana:10},
   weapons:[...model.state.weapons,...explorationWeapons.filter(weapon=>!model.state.weapons.some(owned=>owned.id===weapon.id)).map(weapon=>({...weapon,proc:weapon.proc?{...weapon.proc}:undefined}))],
   spells:shamanSpells.map(spell=>({...spell,message:spell.description})),
  }
  return {id:randomId(),revision:0,model,rewardGold:0,finishedAt:null,abandoned:false}
 })
 const current=useRef(receipt)
 function publish(next:ExplorationReceipt){current.current=next;setReceipt(next);return next}
 async function dispatch(request:ExplorationRequest){
  const previous=current.current
  if(request.runId!==previous.id||request.revision!==previous.revision||request.action.type==='start'||request.action.type==='resume')throw Object.assign(Error('INVALID_TEST_ACTION'),{definitive:true})
  try{
   if(request.action.type==='leave')return publish({...previous,revision:previous.revision+1,abandoned:true})
   const model=applyExplorationAction(previous.model,request.action)
   return publish({...previous,revision:previous.revision+1,model,finishedAt:model.state.completed?new Date().toISOString():null})
  }catch(error){throw Object.assign(error instanceof Error?error:Error('INVALID_TEST_ACTION'),{definitive:true})}
 }
 function chooseRoom(index:number,value:string){
  const previous=current.current,{model}=previous,state=model.state
  if(model.view!=='doors'||requiredDoorRoom(state)||index<0||index>=state.market.doors.length)return
  const monster=value.startsWith('monster:')?value.slice(8):undefined
  const room=monster?'monster':value
  if(!roomTypes.some(item=>item.id===room)||monster&&!testMonsters.some(item=>item.id===monster))return
  const doors=state.market.doors.map((id,i)=>i===index?room as RoomTypeId:id)
  const monsterIds=doors.map((_,i)=>i===index?(monster as MonsterId|undefined)??'random':state.market.monsterIds?.[i]??'random')
  publish({...previous,model:{...model,state:{...state,market:{...state.market,doors,monsterIds}}}})
 }
 return <ExplorationPlay runId={receipt.id} nickname={nickname} avatarPath={avatarPath} onLeave={onLeave} receipt={receipt} dispatch={dispatch} reload={()=>{}} testTools={disabled=><div className="exploration-room-picker" aria-label="테스트 방 선택">
  {receipt.model.state.market.doors.map((room,index)=>{const monster=receipt.model.state.market.monsterIds?.[index];return <label key={index}><span>{index+1}번 문</span><select aria-label={`${index+1}번 문 방 유형`} disabled={disabled} value={room==='monster'&&monster&&monster!=='random'?`monster:${monster}`:room} onChange={event=>chooseRoom(index,event.target.value)}>
   {roomTypes.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}
   <optgroup label="몬스터 선택">{regularMonsters.map(item=><option key={item.id} value={`monster:${item.id}`}>{item.name}</option>)}</optgroup>
   <optgroup label="신규 보스 테스트">{testMonsters.filter(item=>item.tier==='boss').map(item=><option key={item.id} value={`monster:${item.id}`}>{item.name}</option>)}</optgroup>
  </select></label>})}
 </div>}/>
}
