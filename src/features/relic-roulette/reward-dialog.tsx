import {useRef} from 'react'
import {Link} from 'react-router'
import {ArrowRight} from 'lucide-react'
import {Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle} from '@/components/ui/dialog'
import {RelicArtwork} from '@/features/relics/relic-artwork'
import {rouletteGrades} from './model'
import type {RouletteSpin} from './api'

export function RouletteRewardDialog({spin,open,onOpenChange}:{spin:RouletteSpin|null;open:boolean;onOpenChange:(open:boolean)=>void}){
  const confirm=useRef<HTMLButtonElement>(null),relic=spin?.relic
  if(!spin||!relic)return null
  const grade=rouletteGrades[spin.grade]
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="roulette-reward-dialog" data-grade={spin.grade} initialFocus={confirm}>
      <DialogHeader><span className="roulette-reward-badge" style={{color:grade.color}}>{grade.label} 유물</span><DialogTitle>유물을 획득했어요!</DialogTitle><DialogDescription>발견한 유물은 보관함에 담았어요.</DialogDescription></DialogHeader>
      <div className="roulette-reward-display"><RelicArtwork relic={relic} className="roulette-reward-illustration"/></div>
      <div className="roulette-reward-copy"><h3>{relic.name}</h3><p>{relic.description}</p></div>
      {relic.quantityBefore!==undefined&&relic.quantityAfter!==undefined&&<div className="roulette-reward-quantity"><span>{relic.quantityBefore>0?'중복 유물 · 보유 수량':'보유 수량'}</span><strong>{relic.quantityBefore.toLocaleString()}개 <ArrowRight size={12}/> {relic.quantityAfter.toLocaleString()}개</strong></div>}
      <div className="roulette-reward-actions"><button ref={confirm} onClick={()=>onOpenChange(false)}>확인</button><Link to="/relics" onClick={()=>onOpenChange(false)}>유물 보관함 <ArrowRight size={13}/></Link></div>
    </DialogContent>
  </Dialog>
}
