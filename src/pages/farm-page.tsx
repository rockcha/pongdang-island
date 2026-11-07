import {lazy, Suspense} from 'react'
import {useAuth} from '@/components/auth-provider'

const FarmEditor=lazy(()=>import('@/features/farm/farm-friends').then(m=>({default:m.FarmWithFriends})))
const loading=<p role="status" className="p-8 text-center text-xs text-muted-foreground">농장을 준비하고 있어요…</p>
export function FarmPage(){
 const {session}=useAuth()
 return <Suspense fallback={loading}><FarmEditor key={session?.user.id}/></Suspense>
}
