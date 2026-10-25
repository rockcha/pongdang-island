import {HalloweenIcon} from '@/components/collection-filter-icons'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { RarityBadge } from '@/components/rarity-badge'
import { CollectibleThumbnail } from '@/features/collection/collectible-thumbnail'
import { kindLabels } from '@/features/collection/api'
import type { FishingAttempt } from './api'
import { FISHING_ANIMATION_MS } from './fishing-presentation'
import type { FishingPresentation } from './fishing-presentation'

export function FishingDialog({open,onClose,presentation,result,pending,error,onRetry,skipAnimation=false}:{skipAnimation?:boolean;open:boolean;onClose:()=>void;presentation:FishingPresentation;result:FishingAttempt|null;pending:boolean;error:string;onRetry:()=>void}){
 const [elapsed,setElapsed]=useState(skipAnimation)
 useEffect(()=>{const timer=setTimeout(()=>setElapsed(true),FISHING_ANIMATION_MS);return()=>clearTimeout(timer)},[])
 const waiting=!error&&(pending||!elapsed)
 return <Dialog open={open} onOpenChange={value=>{if(!value&&!waiting)onClose()}}>
  <DialogContent showCloseButton={!waiting} className={`${skipAnimation?'':'h-[min(620px,90dvh)] grid-rows-[auto_auto_1fr_auto]'} max-h-[90dvh] overflow-y-auto rounded-3xl text-center sm:max-w-sm`}>
   <DialogHeader className="min-h-16 items-center"><DialogTitle>{waiting?'퐁이가 낚시하는 중…':error?'결과를 확인해주세요':'낚시 결과'}</DialogTitle><DialogDescription>{waiting?'물결 너머의 작은 신호를 기다려요.':error?'연결 상태를 확인하고 다시 시도할 수 있어요.':'이번 낚시의 소식을 가져왔어요.'}</DialogDescription></DialogHeader>
   {!skipAnimation&&<div className="mx-auto"><div role="img" aria-label={presentation.scene.label} data-scene={presentation.scene.id} className={`pongi-fishing ${waiting?'':'pongi-fishing-still'}`} style={{backgroundImage:`url("${presentation.scene.image}")`}}/></div>}
   {waiting?<div role="status" className="space-y-3"><span className="text-xs tracking-widest text-primary">바닷속 TMI</span><p className="min-h-12 text-sm leading-6 text-muted-foreground">{presentation.trivia.text}</p><div className="mx-auto flex w-fit gap-1.5" aria-hidden="true">{[0,1,2].map(n=><span key={n} className="fishing-wait-dot size-1.5 rounded-full bg-primary/40" style={{animationDelay:`${n*180}ms`}}/>)}</div></div>:error?<div role="alert" className="space-y-4"><p className="text-sm text-destructive">{error}</p><Button className="min-h-11 w-full" disabled={pending} onClick={onRetry}>결과 다시 확인</Button></div>:result?<div role="status" className="space-y-2">{result.species?<><div className="flex items-center justify-center gap-3"><CollectibleThumbnail species={result.species} path={result.species.thumbnail_path} name={result.species.name} className="size-16"/><div><p className="text-lg font-bold">{result.species.id.startsWith('halloween-')&&<span className="mr-1 inline-flex align-middle"><HalloweenIcon className="size-[1em]"/></span>}{result.species.name} 획득!</p>{result.species.rarity?<RarityBadge rarity={result.species.rarity}/>:<span className="text-xs text-muted-foreground">{kindLabels[result.species.kind]}</span>}</div></div><p className="line-clamp-2 text-xs leading-5 text-muted-foreground">{result.species.description}</p><p className="text-xs text-primary">{(result.species.kind==='map'||result.species.kind==='relic')?'도감에 발견 기록이 남았어요.':'보관함에 들어갔어요. 아쿠아리움에서 어항에 넣을 수 있어요.'}</p></>:<><p className="text-xl font-bold text-muted-foreground">낚시 실패</p><p className="text-sm leading-6 text-muted-foreground">{presentation.failure}</p></>}</div>:null}
   <div className="min-h-11">{!waiting&&<Button className="min-h-11 w-full" variant={error?'outline':'default'} onClick={onClose}>{error?'닫기':'확인'}</Button>}</div>
  </DialogContent>
 </Dialog>
}
