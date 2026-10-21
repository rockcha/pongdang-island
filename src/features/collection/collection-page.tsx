import {useAuth} from '@/components/auth-provider'
import {CollectionBook} from './collection-dialog'
import {useSearchParams} from 'react-router'
import {regionIcons} from '@/features/regions/region-icons'

export function CollectionPage({animationPreview=false}:{animationPreview?:boolean}){
 const {session}=useAuth()
 const [params]=useSearchParams(),region=params.get('region')??'all'
 const initialRegion=regionIcons[region]?region:'all'
 return <section className="flex min-h-0 flex-1 flex-col">
  {animationPreview&&<p className="shrink-0 border-b px-4 py-3 text-xs text-muted-foreground">테스트용 도감 · 포획 기록과 관계없이 컬러 애니메이션을 확인해요.</p>}
  <CollectionBook key={`${session?.user.id}:${animationPreview}:${initialRegion}`} previewAll={animationPreview} initialRegion={initialRegion}/>
 </section>
}
