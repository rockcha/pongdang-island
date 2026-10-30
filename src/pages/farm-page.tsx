import {lazy, Suspense} from 'react'
import {Link} from 'react-router'
import {ArrowLeft} from 'lucide-react'
import {appArt} from '@/components/app-art'
import {useOperator} from '@/features/notices/use-operator'

const FarmEditor=lazy(()=>import('@/features/farm/isometric-farm').then(m=>({default:m.IsometricFarmPage})))
const loading=<p role="status" className="p-8 text-center text-xs text-muted-foreground">농장을 준비하고 있어요…</p>
export function FarmPage(){
 const {operator,loading:checking}=useOperator()
 if(checking)return loading
 if(operator)return <Suspense fallback={loading}><FarmEditor/></Suspense>
 return <section aria-labelledby="farm-title" className="flex min-h-dvh flex-col bg-background px-6">
  <Link to="/aquarium" className="mt-5 inline-flex min-h-11 w-fit items-center gap-2 text-sm text-muted-foreground"><ArrowLeft size={18}/>내 어항으로</Link>
  <div className="flex flex-1 flex-col items-center justify-center gap-4 pb-20 text-center">
   <appArt.farm className="size-24"/>
   <p className="text-xs text-muted-foreground">농장</p>
   <h1 id="farm-title" className="text-xl font-medium text-primary">준비 중이에요</h1>
   <p className="text-sm leading-6 text-muted-foreground">작은 농장을 가꿀 공간을 준비하고 있어요.</p>
  </div>
 </section>
}
