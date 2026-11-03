import type {CSSProperties} from 'react'
import {Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle} from '@/components/ui/dialog'
import {RelicArtwork} from './relic-artwork'
import type {Relic} from './api'

export function RelicFusionEffect({materials,rarity}:{materials:Relic[];rarity:Relic['rarity']}){
 return <Dialog open onOpenChange={()=>{}}><DialogContent showCloseButton={false} className="relic-fusion-dialog" aria-busy="true"><DialogHeader><DialogTitle>유물을 재조합하고 있어요</DialogTitle><DialogDescription>여섯 개의 유물이 새로운 빛으로 모여요.</DialogDescription></DialogHeader><div className="relic-fusion-stage" data-rarity={rarity} aria-hidden="true"><span className="relic-fusion-ring"/><span className="relic-fusion-ring relic-fusion-ring-second"/>{materials.map((relic,index)=>{const angle=index*Math.PI/3-Math.PI/2;return <span className="relic-fusion-material" key={`${relic.id}-${index}`} style={{'--fusion-x':`${Math.cos(angle)*85}px`,'--fusion-y':`${Math.sin(angle)*85}px`,'--fusion-delay':`${index*30}ms`} as CSSProperties}><RelicArtwork relic={relic} className="size-11"/></span>})}<span className="relic-fusion-core"><img src="/app-icons/relic.png" alt=""/></span><span className="relic-fusion-bloom"/></div><p className="relic-fusion-note">곧 새로운 유물을 만나요</p></DialogContent></Dialog>
}
