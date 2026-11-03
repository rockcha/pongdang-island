import {getFloorMonster,type MonsterId} from './monster-catalog'
import type {PracticeState} from './practice-state'
import {HealthMeter} from './health-meter'

export function DormantMonsterHealth({id,state}:{id:MonsterId;state:PracticeState}){
 const monster=getFloorMonster(id,state.market.floor,state.mode==='practice',!!state.growth)
 return <div className="exploration-dormant-health"><div><span>{monster.name} 체력</span><strong>{monster.maxHp} / {monster.maxHp}</strong></div><HealthMeter value={monster.maxHp} max={monster.maxHp} label={`${monster.name} 체력`}/></div>
}
