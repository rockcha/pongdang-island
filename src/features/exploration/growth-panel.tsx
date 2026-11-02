import {useState} from 'react'
import {ArrowRight,ChevronRight,Droplets,Heart,Sparkles,Swords,Wind} from 'lucide-react'
import {Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle} from '@/components/ui/dialog'
import {availableGrowthPoints,growthBonus,growthStats,type GrowthStat} from './growth'
import {basicAttackEvasion,playerAttackStats,playerManaMax,playerMaxHp,type PracticeState} from './practice-state'
import './growth.css'

export function GrowthPanel({state,onAllocate,busy=false,ready=true}:{state:PracticeState;onAllocate:(stat:GrowthStat)=>void;busy?:boolean;ready?:boolean}){
 const [review,setReview]=useState(false)
 if(!state.growth)return null
 const points=availableGrowthPoints(state),required=points>0&&!state.completed&&state.hp>0&&!state.combat&&ready
 const values={health:playerMaxHp(state),mana:playerManaMax(state),attack:playerAttackStats(state).attack,magic:growthBonus(state,'magic'),evasion:basicAttackEvasion(state,'physical')}
 const icons={health:Heart,mana:Droplets,attack:Swords,magic:Sparkles,evasion:Wind}
 const labels={health:'최대 체력',mana:'최대 마나',attack:'기본 공격력',magic:'추가 마법 피해',evasion:'물리 회피율'}
 return <><button className="exploration-growth-trigger" onClick={()=>setReview(true)}>성장 능력치{points>0?` · ${points}점`:` · ${Object.values(state.growth.allocations).reduce((sum,n)=>sum+n,0)}/7`}</button>
 <Dialog open={required||review} onOpenChange={open=>{if(!required)setReview(open)}}><DialogContent className="exploration-modal exploration-growth-panel" showCloseButton={!required}>
  <DialogHeader><div className="growth-heading"><span className="growth-heading-icon"><Sparkles size={20}/></span><DialogTitle>{required?'어떤 힘을 키울까요?':'이번 탐험의 성장'}</DialogTitle>{required&&<span className="growth-points" aria-label={`남은 성장 포인트 ${points}점`}><strong>{points}</strong> POINT</span>}</div><DialogDescription>{required?'카드를 눌러 하나를 강화하세요. 같은 능력치에 다시 투자할 수 있어요.':'10개 층을 돌파할 때마다 성장 포인트를 1점씩 받습니다. 성장은 이번 탐험에서만 유지됩니다.'}</DialogDescription></DialogHeader>
  <div className="exploration-growth-options">{growthStats.map(stat=>{
   const Icon=icons[stat.id],current=values[stat.id],next=stat.id==='evasion'?Math.min(100,current+stat.amount):current+stat.amount,unit=stat.id==='evasion'?'%':''
   const content=<><span className="growth-stat-icon"><Icon size={23} strokeWidth={1.7}/></span><span className="growth-stat-copy"><span className="growth-stat-title">{stat.name}<span className="growth-increment">+{stat.amount}{stat.id==='evasion'?'%p':''}</span><small>{state.growth!.allocations[stat.id]}회 투자</small></span><span className="growth-stat-value"><span className="growth-value-label">{labels[stat.id]}</span><span className={required?'growth-before':'growth-current'}>{current}{unit}</span>{required&&<><ArrowRight size={15} aria-hidden="true"/><strong>{next}{unit}</strong></>}</span><span className="growth-stat-note">{stat.description}</span></span>{required&&<ChevronRight className="growth-card-arrow" size={18}/>}</>
   return required?<button key={stat.id} className="growth-option" data-growth-stat={stat.id} disabled={busy} aria-label={`${stat.name} 선택 · ${stat.effect}`} onClick={()=>onAllocate(stat.id)}>{content}</button>:<article key={stat.id} className="growth-option" data-growth-stat={stat.id}>{content}</article>
  })}</div>
  {!required&&<button className="exploration-modal-return" onClick={()=>setReview(false)}>닫기</button>}
 </DialogContent></Dialog></>
}
