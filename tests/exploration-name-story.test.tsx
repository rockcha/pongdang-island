import {useState} from 'react'
import {writeFileSync} from 'node:fs'
import {cleanup,fireEvent,render,screen} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
import {merchantGoods,newPractice,type PracticeState} from '@/features/exploration/practice-state'
import {resolveCombatTurn,startMonsterCombat} from '@/features/exploration/combat-state'
import {getFloorMonster,regularMonsters} from '@/features/exploration/monster-catalog'
import {NameStoryRoom} from '@/features/exploration/name-story-room'
import {canAppeaseNameGuardian,nameStoryGreeting,progressNameStory} from '@/features/exploration/name-story'
import {createRoomVisit,type AdventureRoomId} from '@/features/exploration/adventure-rooms'
import {advanceExploration,canLeaveRoom} from '@/features/exploration/run-state'
import {canUseTeleport,drawPracticeFloor} from '@/features/exploration/campaign'
afterEach(cleanup)
function captureWarden(stage:string){if(process.env.ROYAL_WARDEN_QA)writeFileSync(`artifacts/royal-warden-${stage}.fragment.html`,document.querySelector('.exploration-name-story')!.outerHTML)}
it('records a harmless early choice, remembers it through floors, and starts a new story in each run',()=>{
 const initial=newPractice(()=>0,'practice'),restored=progressNameStory(initial,'restore')
 expect(restored.hp).toBe(initial.hp);expect(restored.gold).toBe(initial.gold);expect(restored.mp).toBe(initial.mp)
 expect(progressNameStory(restored,'leave-name')).toBe(restored)
 expect(advanceExploration(restored,()=>0).nameStory?.choice).toBe('restored')
 expect(nameStoryGreeting(restored)).toContain('내 이름을 돌려놓은')
 expect(nameStoryGreeting(progressNameStory(initial,'leave-name'))).toContain('침입자')
 expect(newPractice(()=>0).nameStory).toBeUndefined()
})
it('requires a restored name or earlier record to open the gate peacefully, without repeated rewards',()=>{
 const initial=newPractice(()=>0)
 expect(progressNameStory(initial,'open-gate')).toBe(initial)
 const staleClue={...initial,nameStory:{nameLearned:true}}
 expect(canAppeaseNameGuardian(staleClue)).toBe(false)
 expect(progressNameStory(staleClue,'open-gate')).toBe(staleClue)
 for(const action of ['restore','read-record'] as const){
  const gate=progressNameStory(progressNameStory(initial,action),'open-gate')
  expect(gate.nameStory?.gateOpened).toBe(true)
  const claimed=progressNameStory(gate,'claim')
  expect(claimed.nameStory?.rewardClaimed).toBe(true)
  expect(progressNameStory(claimed,'claim')).toBe(claimed)
 }
 expect(progressNameStory(initial,'claim')).toBe(initial)
})
it('places the three chapters at fixed floors and protects them from teleport skips',()=>{
 for(const [floor,id] of [[6,'erased-name'],[22,'erased-name-record'],[34,'nameless-guardian']] as const){
  expect(drawPracticeFloor(floor,()=>.99).doors).toContain(id)
  for(const source of [floor-2,floor-1,floor])expect(canUseTeleport(source)).toBe(false)
 }
})
function show(id:AdventureRoomId,story?:PracticeState['nameStory']){
 const initial={...newPractice(()=>0),nameStory:story},visit=createRoomVisit(id,initial,'story',()=>0),loot=vi.fn(),descend=vi.fn(),encounter=vi.fn()
 function Harness(){const [state,onChange]=useState(initial);return <NameStoryRoom visit={visit} state={state} onChange={onChange} onTalk={()=>{}} onDescend={descend} onLoot={loot} onEncounter={encounter}/>}
 render(<Harness/>);return {loot,descend,encounter}
}
it('offers two early choices with no immediate item or gold reward',()=>{
 const {loot}=show('erased-name')
 fireEvent.click(screen.getByRole('button',{name:'지워진 이름을 다시 새긴다'}))
 expect(screen.getByRole('status',{name:'방 진행'}).textContent).toContain('아무 일도 일어나지 않았다')
 expect(loot).not.toHaveBeenCalled();expect(screen.getByRole('button',{name:'아래층으로 내려간다.'})).toBeTruthy()
})
it('remembers the restored name, supports the last request, and gives the opened gate reward once',()=>{
 const {loot}=show('nameless-guardian',{choice:'restored',nameLearned:true})
 expect(screen.getByRole('img',{name:'왕실 수문장 𓋴𓈖𓅱'}).getAttribute('src')).toBe('/exploration/npcs/nameless-royal-warden.png')
 expect(document.querySelector('.exploration-story-guardian.is-awakened')).toBeTruthy()
 captureWarden('remembered')
 expect(screen.getByRole('status',{name:'방 진행'}).textContent).toContain('너였구나')
 fireEvent.click(screen.getByRole('button',{name:'그의 마지막 부탁을 듣는다'}))
 fireEvent.click(screen.getByRole('button',{name:'그가 지키던 문에 대해 묻는다'}))
 expect(document.querySelector('.exploration-story-guardian.is-gate-open')).toBeTruthy()
 captureWarden('opened')
 fireEvent.click(screen.getByRole('button',{name:'열린 문 안을 살펴본다'}))
 expect(loot).toHaveBeenCalledTimes(1)
 expect(screen.queryByRole('button',{name:'열린 문 안을 살펴본다'})).toBeNull()
})
it('lets a player who read the earlier record speak the name and receive an advanced relic peacefully',()=>{
 const {loot,encounter}=show('nameless-guardian',{choice:'left',recordRead:true,nameLearned:true})
 expect(screen.getByRole('img',{name:'이름 없는 왕실 수문장'})).toBeTruthy()
 expect(document.querySelector('.exploration-story-guardian.is-awakened')).toBeNull()
 fireEvent.click(screen.getByRole('button',{name:'벽에 새겨진 이름을 불러준다'}))
 expect(document.querySelector('.exploration-story-guardian.is-awakened.is-gate-open')).toBeTruthy()
 fireEvent.click(screen.getByRole('button',{name:'열린 문 안을 살펴본다'}))
 expect(loot).toHaveBeenCalledTimes(1)
 expect(merchantGoods.find(item=>item.id===loot.mock.calls[0][0].id)?.tier).toBe('advanced')
 expect(encounter).not.toHaveBeenCalled()
})
it.each([undefined,{choice:'left' as const},{nameLearned:true}])('requires combat when earlier interactions were missed (%j)',story=>{
 const {loot,descend,encounter}=show('nameless-guardian',story)
 captureWarden('unknown')
 expect(screen.queryByRole('button',{name:'주변에 남은 흔적을 살핀다'})).toBeNull()
 expect(screen.queryByRole('button',{name:'문지기를 두고 지나간다'})).toBeNull()
 expect(screen.queryByRole('button',{name:'벽에 새겨진 이름을 불러준다'})).toBeNull()
 const fight=screen.getByRole('button',{name:'수문장과 싸운다'})
 fireEvent.click(fight);fireEvent.click(fight)
 expect(encounter).toHaveBeenCalledExactlyOnceWith('nameless-royal-warden')
 expect(loot).not.toHaveBeenCalled();expect(descend).not.toHaveBeenCalled()
})
it('gives the story fight its own fixed balance, blocks fleeing and opens the gate only after victory',()=>{
 const fresh=newPractice(()=>0,'practice'),initial={...fresh,market:{...fresh.market,floor:34},weapons:fresh.weapons.map(item=>({...item,attack:1000}))}
 const warden=getFloorMonster('nameless-royal-warden',34,true),anubis=getFloorMonster('obsidian-anubis',30,true)
 expect(warden.maxHp).toBeLessThan(anubis.maxHp);expect(warden.attack).toBeLessThan(anubis.attack)
 expect(regularMonsters.some(item=>item.id===warden.id)).toBe(false)
 const fight=startMonsterCombat(initial,warden.id,{random:()=>0})
 expect(fight.combat?.enemyHp).toBe(120)
 expect(merchantGoods.find(item=>item.id===fight.combat?.loot?.id)?.tier).toBe('advanced')
 expect(canLeaveRoom(fight)).toBe(false)
 expect(resolveCombatTurn(fight,{type:'flee'},()=>0).state).toBe(fight)
 const victory=resolveCombatTurn(fight,{type:'attack'},()=>.99).state
 expect(victory.nameStory).toMatchObject({guardianDefeated:true,gateOpened:true})
 expect(victory.nameStory?.rewardClaimed).not.toBe(true)
 expect(canLeaveRoom(victory)).toBe(false)
 expect(victory.gold).toBe(initial.gold)
 expect(startMonsterCombat(victory,warden.id)).toBe(victory)
 expect(startMonsterCombat(progressNameStory(initial,'restore'),warden.id).combat).toBeNull()
 const weak={...initial,hp:1,weapons:initial.weapons.map(item=>({...item,attack:1}))}
 const defeat=resolveCombatTurn(startMonsterCombat(weak,warden.id),{type:'attack'},()=>.99).state
 expect(defeat.combat?.status).toBe('lost');expect(defeat.nameStory?.gateOpened).not.toBe(true)
})
