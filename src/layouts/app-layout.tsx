import { GoldIcon, useGold } from '@/features/gold/gold-provider'
import { Link, Outlet, useLocation } from 'react-router'
import { HeaderPlaceNavigation } from '@/components/header-place-navigation'
import { BrandMascot } from '@/components/brand-mascot'
import { useAuth } from '@/components/auth-provider'
import { NotificationMenu } from '@/features/notifications/notification-menu'
import { AttendanceButton } from '@/features/attendance/attendance-button'
import { AvatarMenu } from '@/features/profile/avatar-menu'
import { PlaceBanner } from '@/components/place-banner'
import { useFishingTripRoute } from '@/features/fishing/fishing-trip'

export function AppLayout() {
  const { session } = useAuth()
  const {pathname}=useLocation()
  useFishingTripRoute(session?.user.id,pathname)
  const aquarium=pathname==='/aquarium'
  const harbor=pathname==='/harbor'
  const fishing=pathname.startsWith('/region/')
  const memory=pathname.startsWith('/arcade/')
  const { wallet, loading: goldLoading, error: goldError } = useGold()
  return <div style={memory?{height:'100dvh',minHeight:0,overflow:'hidden'}:undefined} className={`app-shell mx-auto flex w-full ${fishing?'':'max-w-md'} flex-col ${aquarium||fishing?'aquarium-shell':harbor?'aquarium-shell px-4':'px-6'}`}>
    <header className={`pongi-header sticky top-0 z-40 shrink-0 px-3 py-2 ${aquarium||harbor||fishing?'':'-mx-6'}`}>
      <div className="flex min-h-10 items-center justify-between gap-2">
      <div className="flex items-center gap-1">
        <Link to="/" className="pongi-brand-title flex items-center gap-1 text-lg font-normal tracking-tight"><BrandMascot decorative className="size-10 object-contain" />퐁당섬</Link>
      </div>
      {session && <div className="flex items-center gap-1">
        <Link to="/shop" aria-label="보유 골드, 상점 이동" className="header-gold mr-1 inline-flex items-center gap-1 text-xs tabular-nums"><GoldIcon className="size-5" /><span>{goldLoading ? '…' : goldError ? '—' : wallet.gold.toLocaleString('ko-KR')}</span></Link>
        <AvatarMenu />
      </div>}
      </div>
      {session && <div className="mt-2 flex items-center gap-2 border-t border-border/70 pt-1">
        <HeaderPlaceNavigation />
        <div className="flex shrink-0 items-center border-l border-border/70 pl-1"><AttendanceButton /><NotificationMenu /></div>
      </div>}
    </header>
    {!harbor&&<PlaceBanner pathname={pathname}/>}
    <main className={`flex flex-1 flex-col ${aquarium||harbor||fishing||memory?'min-h-0 overflow-hidden':''}`}><Outlet /></main>
  </div>
}
