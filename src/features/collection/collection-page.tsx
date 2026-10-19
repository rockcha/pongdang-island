import {useAuth} from '@/components/auth-provider'
import {CollectionBook} from './collection-dialog'

export function CollectionPage({animationPreview=false}:{animationPreview?:boolean}){
 const {session}=useAuth()
 return <section className="flex min-h-0 flex-1 flex-col">
  {animationPreview&&<p className="shrink-0 border-b px-4 py-3 text-xs text-muted-foreground">테스트용 도감 · 포획 기록과 관계없이 컬러 애니메이션을 확인해요.</p>}
  <CollectionBook key={`${session?.user.id}:${animationPreview}`} previewAll={animationPreview}/>
 </section>
}
