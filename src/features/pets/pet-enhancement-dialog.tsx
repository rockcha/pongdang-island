import { useEffect, useId, useState } from 'react'
import { ArrowRight, Check, Sparkles } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { PET_MAX_LEVEL, petJobBonus, petSpeciesById } from './pet-catalog'
import { petEnhancementIssue, type PreviewPet } from './pet-preview-model'
import './pet-enhancement.css'

type Props={pet:PreviewPet;pets:PreviewPet[];busy:boolean;onClose:()=>void;onEnhance:(materialId:string,expectedLevel:number)=>void;onJobs:()=>void}
export function PetEnhancementDialog({pet,pets,busy,onClose,onEnhance,onJobs}:Props){
  const [baseline,setBaseline]=useState(pet.level),[materialId,setMaterialId]=useState<string|null>(null),[reviewing,setReviewing]=useState(false),[page,setPage]=useState(0),[settled,setSettled]=useState(false)
  const id=useId(),result=pet.level>baseline,maxed=pet.level>=PET_MAX_LEVEL
  const candidates=pets.filter(p=>p.id!==pet.id&&p.speciesId===pet.speciesId&&p.level===0&&!p.job)
  const material=candidates.find(p=>p.id===materialId)
  const issue=petEnhancementIssue(pet,material)
  const pages=Math.max(1,Math.ceil(candidates.length/4)),at=Math.min(page,pages-1)
  useEffect(()=>{
    if(!result)return
    const timer=setTimeout(()=>setSettled(true),1400)
    return ()=>clearTimeout(timer)
  },[result,pet.level])
  const portrait=(p:PreviewPet,label?:string)=> <div className="pet-enhance-person">{label&&<small className="pet-enhance-person-label">{label}</small>}<img src={`/pets/${p.speciesId}_v1_thumbnail.png`} alt=""/><strong>{p.name} <span className="pet-level-badge">+{p.level}</span></strong></div>
  return <Dialog open onOpenChange={open=>{if(!open)onClose()}}><DialogContent className="pet-enhance-dialog">
    <DialogTitle>{result?'강화 완료':reviewing?'이 친구를 재료로 사용할까요?':'펫 강화'}</DialogTitle>
    <DialogDescription>{result?`${pet.name}이 +${pet.level}로 성장했어요.`:reviewing?'재료 펫은 사라지며 되돌릴 수 없어요. 대상의 이름과 포만도·애정은 유지돼요.':'같은 종의 +0 펫 한 마리로 확정 강화해요. 추가 골드는 들지 않아요.'}</DialogDescription>
    {result ? <>
      <div className="pet-enhance-celebration" key={pet.level} aria-busy={!settled}>
        <svg viewBox="0 0 180 180" className="pet-enhance-halo" aria-hidden="true"><defs><linearGradient id={id}><stop stopColor="#d6bf91"/><stop offset="1" stopColor="#a4baa2"/></linearGradient></defs><circle cx="90" cy="90" r="69" fill="none" stroke={`url(#${id})`} strokeWidth="1.5"/><circle cx="90" cy="90" r="78" fill="none" stroke="#dbcbb0" strokeWidth=".7"/>{Array.from({length:6},(_,i)=>{const angle=i*Math.PI/3,x=90+Math.cos(angle)*72,y=90+Math.sin(angle)*72;return <path key={i} className="pet-enhance-spark" style={{animationDelay:`${i*65}ms`}} d={`M${x} ${y-4}l1.3 2.7 2.7 1.3-2.7 1.3L${x} ${y+4}l-1.3-2.7-2.7-1.3 2.7-1.3Z`} fill="#c5ad7c"/>})}</svg>
        <img src={`/pets/${pet.speciesId}_v1_thumbnail.png`} alt=""/>
        <strong className="pet-enhance-result-level" role="status">+{pet.level}</strong>
      </div>
      <div className="pet-enhance-unlocks"><p><Check size={14}/> 전용 알바 보상 +{petJobBonus(pet.level)}%</p><span>근무 시간은 그대로 · 다음 출발부터 적용돼요</span></div>
      <div className="pet-enhance-footer">{!maxed&&<button disabled={!settled} onClick={()=>{setBaseline(pet.level);setMaterialId(null);setReviewing(false);setSettled(false);setPage(0)}}>계속 강화</button>}<button className="is-primary" onClick={onJobs}>알바 보러 가기</button></div>
    </> : reviewing&&material ? <>
      <div className="pet-enhance-pair">{portrait(material,'재료 · 사라져요')}<ArrowRight size={20} aria-hidden="true"/>{portrait(pet,'강화 대상')}</div>
      <div className="pet-enhance-summary"><span>강화 결과</span><strong>{pet.name} +{pet.level} <ArrowRight size={12}/> +{pet.level+1}</strong><small>알바 보상 +{petJobBonus(pet.level)}% → +{petJobBonus(pet.level+1)}%</small><small>성공 확률 100% · 재료 1마리 소모</small></div>
      <div className="pet-enhance-footer"><button onClick={()=>setReviewing(false)}>돌아가기</button><button className="is-primary" disabled={busy||!!issue} onClick={()=>onEnhance(material.id,pet.level)}>확인하고 강화</button></div>
    </> : <>
      <div className="pet-enhance-target">{portrait(pet)}<span className="pet-enhance-target-step">{maxed?'MAX':<>+{pet.level}<ArrowRight size={13}/>+{pet.level+1}</>}</span></div>
      {maxed ? <p className="pet-enhance-next">최고 강화 +5 · 전용 알바 보상 +15%</p> : pet.job ? <p className="pet-enhance-next">알바 보상을 받은 뒤 강화할 수 있어요.</p> : <>
        <div className="pet-enhance-material-heading"><span>재료 선택</span><small>{petSpeciesById(pet.speciesId).name} · +0</small></div>
        {candidates.length ? <div className="pet-enhance-materials">{candidates.slice(at*4,at*4+4).map(p=><button key={p.id} aria-label={`${p.name} +0`} aria-pressed={materialId===p.id} onClick={()=>setMaterialId(p.id)}><img src={`/pets/${p.speciesId}_v1_thumbnail.png`} alt=""/><span>{p.name}<small>+0</small></span>{materialId===p.id&&<Check size={14}/>}</button>)}</div> : <p className="pet-enhance-empty">같은 종의 +0 친구가 필요해요.<br/>운영자 테스트 도구에서 같은 종을 추가해 볼 수 있어요.</p>}
        {pages>1&&<div className="pet-pagination"><button disabled={!at} onClick={()=>setPage(at-1)}>이전</button><span>{at+1} / {pages}</span><button disabled={at===pages-1} onClick={()=>setPage(at+1)}>다음</button></div>}
        {material&&<p className="pet-enhance-material-warning">{material.name}은 강화 재료로 사라져요.</p>}
      </>}
      <div className="pet-enhance-footer"><button onClick={onClose}>닫기</button>{!maxed&&<button className="is-primary" disabled={busy||!!issue} onClick={()=>setReviewing(true)}><Sparkles size={14}/> 강화하기</button>}</div>
    </>}
  </DialogContent></Dialog>
}
