import {lazy, Suspense} from 'react'
import {useAuth} from '@/components/auth-provider'
import {useSearchParams} from 'react-router'
import {useAccountResource} from '@/lib/account-query'
import {readFarmFriends} from '@/features/farm/friend-directory-api'
import {readAccountFarm} from '@/features/farm/account-api'

const FarmEditor=lazy(()=>import('@/features/farm/farm-friends').then(m=>({default:m.FarmWithFriends})))
const loading=<p role="status" className="p-8 text-center text-xs text-muted-foreground">농장을 준비하고 있어요…</p>
export function FarmPage(){
 const {session}=useAuth()
 const [params]=useSearchParams(),target=params.get('visit')
 // These observers commit with the fallback instead of waiting for the editor.
 // The editor shares the same account keys, so requests are deduplicated.
 useAccountResource('farm-friends',readFarmFriends)
 useAccountResource('farm',readAccountFarm,{enabled:!target||target===session?.user.id})
 return <Suspense fallback={loading}><FarmEditor key={session?.user.id}/></Suspense>
}
