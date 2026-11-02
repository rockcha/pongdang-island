import {useState} from 'react'
import {formatBasicAttack} from './attack-roll'
import {hasTimedSpell} from './timed-spells'
import {Info} from 'lucide-react'
import {StatIcon,type StatKind} from './equipment-stats'
import {basicAttackEvasion,playerAttackStats,type PracticeState} from './practice-state'
import {Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle} from '@/components/ui/dialog'

export function ExplorerCombatStats({state,iconsOnly=false}:{state:PracticeState;iconsOnly?:boolean}){
 const [selected,setSelected]=useState<StatKind|null>(null)
 const [guide,setGuide]=useState(false)
 const armor=state.armor.find(item=>item.id===state.armorId),attackStats=playerAttackStats(state)
 const combat=state.combat?.status==='active'?state.combat:undefined
 const stats=[
  {kind:'attack',label:'공격력',value:formatBasicAttack(attackStats.attack,attackStats.variance),unit:'',description:(attackStats.variance?`기본 공격마다 ±${attackStats.variance} 범위로 변동하며 최소 1입니다.`:'편차 없이 표시된 공격력으로 공격합니다.')+' 강화·약화를 반영한 수치이며, 치명타와 적 방어력은 이후 적용됩니다.'},
  {kind:'critical',label:'치명타',value:attackStats.critical,unit:'%',description:'기본 공격이 치명타가 될 확률입니다. 치명타의 직접 피해는 2배입니다.'},
  {kind:'evasion',label:'회피율',value:basicAttackEvasion(state,'physical'),unit:'%',description:'적의 물리 기본 공격을 피할 확률입니다. 마법 공격에는 적용되지 않습니다.'},
  {kind:'defense',label:'방어력',value:(armor?.reduction??0)*(hasTimedSpell(state,'sandstone-skin')?2:1),unit:'',description:'적의 물리 공격 피해를 줄입니다. 방어력 적용 후에도 최소 1 피해를 받으며, 보호막은 별도로 적용됩니다.'},
  {kind:'resistance',label:'마법 저항력',value:(armor?.magicReduction??0)*(hasTimedSpell(state,'lapis-veil')?2:1)-(combat?.magicResistanceDown??0),unit:'',description:'적의 마법 피해를 줄입니다. 감소 효과로 음수가 되면 받는 마법 피해가 늘어납니다.'},
 ] satisfies Array<{kind:StatKind;label:string;value:string|number;unit:string;description:string}>
 const current=stats.find(stat=>stat.kind===selected)
 const list=<dl className={`exploration-combat-stats ${iconsOnly?'is-icons-only':''}`} aria-label="현재 전투 능력치" data-attack-variance={attackStats.variance>0}>{stats.map(stat=><div key={stat.kind} data-stat={stat.kind} role="button" tabIndex={0} aria-label={`${stat.label} ${stat.value}${stat.unit} 설명`} title={stat.description} onClick={()=>setSelected(stat.kind)} onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();setSelected(stat.kind)}}}>
  <dt><StatIcon kind={stat.kind}/><span className="stat-label-long">{stat.label}</span><span className="stat-label-short" aria-hidden="true">{{attack:'공격',critical:'치명',evasion:'회피',defense:'방어',resistance:'마저',health:'체력',escape:'도망'}[stat.kind]}</span></dt><dd>{stat.value}{stat.unit&&<small>{stat.unit}</small>}</dd>
 </div>)}</dl>
 return <>{iconsOnly?<div className="exploration-stat-summary">{list}<button className="exploration-stat-help" aria-label="능력치 아이콘 안내" onClick={()=>setGuide(true)}><Info size={16}/></button></div>:list}
  <Dialog open={guide||!!current} onOpenChange={open=>{if(!open){setSelected(null);setGuide(false)}}}><DialogContent className={`exploration-modal exploration-stat-guide ${guide?'exploration-stat-legend':''}`}><DialogHeader><DialogTitle>{guide?'능력치 아이콘 안내':<>{current?.label} · {current?.value}{current?.unit}</>}</DialogTitle><DialogDescription>{guide?'각 아이콘은 현재 장비와 전투 효과를 반영한 능력치예요.':current?.description}</DialogDescription></DialogHeader>
   {guide&&<dl className="exploration-stat-legend-list">{stats.map(stat=><div key={stat.kind} data-stat={stat.kind}><dt><StatIcon kind={stat.kind}/>{stat.label}<strong>{stat.value}{stat.unit}</strong></dt><dd>{stat.description}</dd></div>)}</dl>}
  </DialogContent></Dialog>
 </>
}
