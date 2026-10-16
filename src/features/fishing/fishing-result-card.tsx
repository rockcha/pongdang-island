import { Button } from '@/components/ui/button'
import { RarityBadge } from '@/components/rarity-badge'
import { CollectibleThumbnail } from '@/features/collection/collectible-thumbnail'
import type { FishingAttempt } from './api'

export function FishingResultCard({result,pending,error,failure,onRetry,onContinue,practice=false}:{practice?:boolean;result:FishingAttempt|null;pending:boolean;error:string;failure:string;onRetry:()=>void;onContinue:()=>void}){
 return <section aria-label="낚시 결과" className="space-y-3 rounded-2xl bg-muted/50 p-4 text-center">
  {pending?<p role="status" className="py-3 text-sm">낚싯줄을 끌어올리는 중…</p>:error?<div role="alert" className="space-y-3"><p className="text-sm text-destructive">{error}</p><Button className="min-h-11 w-full" onClick={onRetry}>결과 다시 확인</Button></div>:result?.species?<div role="status" className="space-y-2"><CollectibleThumbnail species={result.species} path={result.species.thumbnail_path} name={result.species.name} className="mx-auto size-20"/><p className="font-semibold">{result.species.name} 획득!</p>{result.species.rarity&&<RarityBadge rarity={result.species.rarity}/>}<p className="text-xs leading-5 text-muted-foreground">{practice?'연습 결과예요. 실제 보상은 지급되지 않아요.':result.species.kind==='map'?'새 항로가 열렸어요.':'보관함에 들어갔어요.'}</p></div>:<div role="status" className="space-y-2"><p className="font-semibold">낚시 실패</p><p className="text-xs text-muted-foreground">{failure}</p><p className="text-xs text-muted-foreground">{practice?'연습에서는 미끼를 사용하지 않아요.':'사용한 미끼 1개는 소모됐어요.'}</p></div>}
  {!pending&&<Button variant="outline" className="min-h-11 w-full" onClick={onContinue}>{error?'닫기':'다시 낚시하기'}</Button>}
 </section>
}
