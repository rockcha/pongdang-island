import {useState} from 'react'
import {useOperator} from '@/features/notices/use-operator'
import {newLocalGrowthModel} from './local-growth-model'
import {allocateGrowth,availableGrowthPoints} from './growth'
import {GrowthPanel} from './growth-panel'
import {ExplorerCombatStats} from './combat-stats'
import {playerMaxHp,playerManaMax,type PracticeState} from './practice-state'
import {HealthMeter} from './health-meter'
import './exploration.css'
import './exploration-hud.css'
import './exploration-header.css'
import './growth.css'

export function ExplorationStatTestPage(){
 const {operator,loading}=useOperator()
 const [state,setState]=useState<PracticeState>(()=>newLocalGrowthModel().state)
 if(loading)return <p role="status" className="p-6">운영자 권한을 확인하고 있어요.</p>
 if(!operator)return <p role="alert" className="p-6">로컬에서 운영자만 이용할 수 있는 화면입니다.</p>
 return <section className="exploration-stat-test-page" aria-label="탐험 스탯 테스트">
  <header><span>OPERATOR PREVIEW</span><h1>탐험 스탯 테스트</h1><p>지하 1층 · 능력치와 성장 선택 UI를 확인하세요.</p></header>
  <section className="exploration-stat-test-card">
   <div className="exploration-test-vital"><span>체력</span><HealthMeter label="테스트 체력" value={state.hp} max={playerMaxHp(state)}/><b>{state.hp}/{playerMaxHp(state)}</b></div>
   <div className="exploration-test-vital"><span>마나</span><progress aria-label="테스트 마나" value={state.mp} max={playerManaMax(state)}/><b>{state.mp}/{playerManaMax(state)}</b></div>
   <ExplorerCombatStats state={state} iconsOnly/>
   <GrowthPanel state={state} onAllocate={stat=>setState(previous=>allocateGrowth(previous,stat))}/>
  </section>
  <div className="exploration-stat-test-actions"><button onClick={()=>setState(previous=>availableGrowthPoints(previous)?previous:{...previous,growth:{...previous.growth!,previewPoints:(previous.growth!.previewPoints??0)+1}})}>스탯 업글 창 뜨기</button><button onClick={()=>setState(newLocalGrowthModel().state)}>초기화</button></div>
  <p className="exploration-stat-test-note">선택한 능력치는 위 표시와 실제 수치에 반영됩니다. 전투·층 이동·저장·운영 보상 없이 이 화면에서만 테스트합니다.</p>
 </section>
}
