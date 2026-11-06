import type {ReactNode} from 'react'
import {Check,CheckCircle2,AlertCircle,LockKeyhole} from 'lucide-react'
import './material-requirements.css'

export type MaterialRequirement={id:string;name:string;owned:number;required:number;icon:ReactNode;unit?:string}
export function MaterialRequirements({items,blocked}:{items:MaterialRequirement[];blocked?:string}){
 const missing=items.filter(item=>item.owned<item.required),ready=!blocked&&!missing.length
 return <section className="farm-materials" aria-label="제작 재료 상태">
  <header data-ready={ready}><span>{ready?<CheckCircle2 size={15}/>:blocked?<LockKeyhole size={15}/>:<AlertCircle size={15}/>}<strong>{blocked??(ready?'제작 가능':'재료 부족')}</strong></span><small>{ready?(items.length?'재료가 모두 준비됐어요':'재료 없이 생산해요'):`${missing.length?`${missing.length}종 재료가 부족해요`:'조건을 먼저 확인해주세요'}`}</small></header>
  {!!items.length&&<div className="farm-material-list" role="group" aria-label="필요한 재료">{items.map(item=>{
   const enough=item.owned>=item.required,unit=item.unit??'개'
   return <div key={item.id} className="farm-material" data-enough={enough} aria-label={`${item.name} · 보유 ${item.owned}${unit} / 필요 ${item.required}${unit} · ${enough?'충분':`${item.required-item.owned}${unit} 부족`}`}>
    {item.icon}<div className="farm-material-copy"><strong>{item.name}</strong><span>보유 <b>{item.owned}</b> / 필요 {item.required}</span></div><small className="farm-material-result">{enough?<><Check size={12}/>충분</>:<>{item.required-item.owned}{unit} 부족</>}</small>
   </div>
  })}</div>}
 </section>
}
