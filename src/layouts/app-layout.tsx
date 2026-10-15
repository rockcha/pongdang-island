import { GoldIcon, useGold } from '@/features/gold/gold-provider'
import { Link, Outlet, useLocation } from 'react-router'
import { IslandNavigation } from '@/components/island-navigation'
import { BrandMascot } from '@/components/brand-mascot'
import { useAuth } from '@/components/auth-provider'
import { NotificationMenu } from '@/features/notifications/notification-menu'
import { AvatarMenu } from '@/features/profile/avatar-menu'
import { PlaceBanner } from '@/components/place-banner'

export function AppLayout() {
  const { session } = useAuth()
  const {pathname}=useLocation()
  const aquarium=pathname==='/aquarium'
  const harbor=pathname==='/harbor'
  const fishing=pathname.startsWith('/region/')
  const { wallet, loading: goldLoading, error: goldError } = useGold()
  return <div className={`app-shell mx-auto flex w-full ${fishing?'':'max-w-md'} flex-col ${aquarium||fishing?'aquarium-shell':harbor?'aquarium-shell px-4':'px-6'}`}>
    <header className={aquarium||harbor||fishing?'shrink-0 px-3 py-2':'space-y-2 py-5'}>
      <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-1">
        {session && <IslandNavigation />}
        <Link to="/" className="flex items-center gap-2 text-lg font-bold tracking-tight"><BrandMascot decorative className="size-10 object-contain" />퐁당섬</Link>
      </div>
      {session && <div className="flex items-center gap-1">
        <NotificationMenu />
        <AvatarMenu />
      </div>}
      </div>
      {session && <div className="flex justify-end"><Link to="/shop" className="flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-sm font-semibold tabular-nums hover:bg-muted" aria-label={goldLoading ? '골드 불러오는 중, 상점 이동' : goldError ? '골드 조회 실패, 상점 이동' : `보유 골드 ${wallet.gold.toLocaleString('ko-KR')}, 상점 이동`}><GoldIcon className="size-6"/><span>{goldLoading ? '…' : goldError ? '—' : wallet.gold.toLocaleString('ko-KR')}</span></Link></div>}
    </header>
    {!harbor&&<PlaceBanner pathname={pathname}/>}
    <main className={`flex flex-1 flex-col ${aquarium||harbor||fishing?'min-h-0 overflow-hidden':''}`}><Outlet /></main>
  </div>
}
