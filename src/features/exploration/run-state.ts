import {queueForcedMerchant} from './merchant-pity'
﻿import {canUseTeleport,drawPracticeFloor,practiceFinalFloor} from './campaign'
import {drawFloorMarket} from './merchant-stock'
import {recordRoomEntry} from './room-rules'
import {getShopkeeper} from './shopkeepers'
import type {PracticeState} from './practice-state'
export function needsNameGuardian(state:PracticeState){return state.mode==='practice'&&state.market.floor===34&&!state.nameStory?.met}
export function meetNameGuardian(state:PracticeState):PracticeState{return needsNameGuardian(state)?{...state,guardianCheckpoint:true,nameStory:{...state.nameStory,met:true}}:state}
export function finishNameGuardian(state:PracticeState):PracticeState{
 if(!state.guardianCheckpoint||state.bossRestPending||!canLeaveRoom(state)||!(state.nameStory?.gateOpened||state.nameStory?.guardianDefeated))return state
 return {...state,guardianCheckpoint:false,combat:null}
}
export function enterBossOasis(state:PracticeState):PracticeState{
 if(!state.bossRestPending||!canLeaveRoom(state))return state
 return {...state,bossRestPending:false,combat:null}
}
export function canLeaveRoom(state:PracticeState){return !state.forcedMerchant&&!state.completed&&state.hp>0&&state.combat?.status!=='active'&&state.combat?.status!=='lost'&&!(state.combat?.status==='won'&&state.combat.loot&&!state.combat.lootClaimed)}
export function needsFinalBoss(state:PracticeState){return state.mode==='practice'&&state.market.floor>=practiceFinalFloor&&!state.finalBossDefeated&&!state.completed}
export function requiredDoorRoom(state:PracticeState){
 if(state.mode!=='practice')return
 if(state.forcedMerchant?.phase==='pending')return getShopkeeper(state.forcedMerchant.id).roomId
 if(needsNameGuardian(state))return 'nameless-guardian' as const
 if(needsFinalBoss(state))return 'boss-pharaoh' as const
}
export function nextRoomLabel(state:PracticeState){if(state.bossRestPending)return '오아시스로 향한다';if(state.pendingFloorAdvance===3)return `지하 ${state.market.floor+3}층으로 이동한다`;return needsFinalBoss(state)?'황금왕 라세프에게 도전한다':state.mode==='practice'&&state.market.floor>=practiceFinalFloor?'탐험을 마친다':'아래층으로 내려간다.'}
export function advanceExploration(state:PracticeState,random=Math.random):PracticeState{
 if(!canLeaveRoom(state)||needsFinalBoss(state)||state.bossRestPending||needsNameGuardian(state)||state.guardianCheckpoint)return state
 if(state.mode==='practice'&&state.market.floor>=practiceFinalFloor)return {...state,completed:true}
 const step=state.pendingFloorAdvance===3&&canUseTeleport(state.market.floor)?3:1
 const floor=state.market.floor+step
 const arriving=queueForcedMerchant({...state,forcedMerchant:undefined,pendingFloorAdvance:undefined,market:{...state.market,floor},roomVisitKey:undefined,shamanStock:null,merchantStocks:{},shamanStocks:{},door:null,combat:null})
 // The guaranteed supplier is met before the doors; avoid offering that same shop again.
 const context=arriving.forcedMerchant?recordRoomEntry(arriving,getShopkeeper(arriving.forcedMerchant.id).roomId):arriving
 const market=state.mode==='practice'?drawPracticeFloor(floor,random,context):drawFloorMarket(floor,random)
 return {...arriving,market}
}
