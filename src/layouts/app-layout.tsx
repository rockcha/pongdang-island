import {Suspense} from 'react'
import { GoldIcon, useGold } from '@/features/gold/gold-provider'
import { Link, Outlet, useLocation } from 'react-router'
import { HeaderPlaceNavigation } from '@/components/header-place-navigation'
import { useAuth } from '@/components/auth-provider'
import { NotificationMenu } from '@/features/notifications/notification-menu'
import { AttendanceButton } from '@/features/attendance/attendance-button'
import { QuestButton } from '@/features/quests/quest-button'
import {MusicToggleButton} from '@/features/music/music-toggle-button'
import {TitleSync} from '@/features/titles/title-sync'
import { AvatarMenu } from '@/features/profile/avatar-menu'
import { PlaceBanner } from '@/components/place-banner'
import { useFishingTripRoute } from '@/features/fishing/fishing-trip'
import {IslandNewsPopup} from '@/components/island-news-popup'

export function AppLayout() {
  const { session } = useAuth()
  const {pathname:routePathname}=useLocation()
  // React Router also matches a trailing slash; keep these pages in the same
  // viewport layout and banner configuration for either URL spelling.
  const pathname=/^\/(?:(?:(?:my-)?bait-)?production(?:-shop)?|shipyard)\/+$/.test(routePathname)?routePathname.replace(/\/+$/,''):routePathname
  useFishingTripRoute(session?.user.id,pathname)
  const aquarium=pathname==='/aquarium'
  const friendAquarium=/^\/friends\/[^/]+\/aquarium\/?$/.test(pathname)
  const tankScreen=aquarium||friendAquarium
  const home=pathname==='/island-news'
  const profile=pathname==='/my-bait-production'||pathname==='/bait-production'||pathname==='/bait-production-shop'||pathname==='/production-shop'||pathname==='/production'||pathname==='/storage'||pathname==='/download'||pathname==='/music-room'||pathname==='/farm'||pathname==='/profile'||pathname==='/titles'||pathname==='/collection'||pathname==='/collection-animation'
  const mailbox=pathname==='/notifications'
  const square=pathname==='/square'
  const showcase=pathname==='/showcase'||pathname.startsWith('/showcase/')
  const noticeList=pathname==='/board'||pathname.startsWith('/board/')||pathname==='/square/notices'||(/^\/square\/notices\/[^/]+$/.test(pathname)&&!pathname.endsWith('/new'))||pathname==='/square/suggestions'||pathname.startsWith('/square/suggestions/')||pathname==='/square/bugs'||pathname.startsWith('/square/bugs/')
  const exchange=pathname==='/merchant-orders'||pathname==='/exchange'||pathname.startsWith('/exchange/')||pathname==='/savings'
  const friends=pathname==='/friends'||pathname==='/hall-of-fame'
  const shop=pathname==='/shop'||pathname==='/item-shop'||pathname==='/shipyard'
  const shipyard=pathname==='/shipyard'
  const baitProductionShop=pathname==='/bait-production-shop'
  const expedition=pathname==='/expeditions'||/^\/friends\/[^/]+\/expeditions\/?$/.test(pathname)
 const warehouse=pathname==='/warehouse'
  const harbor=pathname==='/harbor'
  const port=pathname==='/port'
  const fishing=pathname.startsWith('/region/')
  const memory=pathname==='/arcade'||pathname.startsWith('/arcade/')
  const { wallet, loading: goldLoading, error: goldError } = useGold()
  if(pathname==='/login'||pathname==='/nickname')return <main className="auth-shell"><Suspense fallback={<p role="status" className="p-8 text-center text-xs text-muted-foreground">불러오는 중…</p>}><Outlet/></Suspense></main>
  if(pathname==='/first-fishing')return <main className="mx-auto flex h-dvh w-full max-w-md flex-col overflow-hidden bg-background"><Suspense fallback={<p role="status" className="p-8 text-center text-xs text-muted-foreground">첫 낚시를 준비하고 있어요.</p>}><Outlet/></Suspense></main>
  return <div style={port||expedition||memory||shop||friends||exchange||square||showcase||noticeList||mailbox||home||profile?{height:'100dvh',minHeight:0,overflow:'hidden'}:undefined} className={`app-shell mx-auto flex w-full max-w-md sm:max-w-[390px] flex-col ${shipyard?'shipyard-shell ':''}${baitProductionShop?'bait-production-shop-shell ':''}${tankScreen||fishing||port?'aquarium-shell':harbor?'aquarium-shell px-4':warehouse?'warehouse-shell px-6':'px-6'}`}>
    <IslandNewsPopup/>
    <header className={`pongi-header sticky top-0 z-40 shrink-0 px-3 py-2 ${tankScreen||harbor||fishing||port?'':'-mx-6'}`}>
      {session && <div className="flex min-h-10 items-center justify-between gap-2">
        <div className="flex shrink-0 items-center gap-0">
        <TitleSync /><NotificationMenu noticeOnly/><NotificationMenu /><AttendanceButton /><QuestButton /><MusicToggleButton /><span aria-hidden="true" className="ml-1 h-5 w-px shrink-0 bg-border"/>
        </div>
        <div className="ml-auto flex min-w-0 items-center gap-1">
        <Link to="/shop" aria-label="보유 골드, 상점 이동" className="header-gold inline-flex min-w-0 items-center gap-1 text-xs tabular-nums"><GoldIcon className="size-5" /><span className="truncate">{goldLoading ? '…' : goldError ? '—' : wallet.gold.toLocaleString('ko-KR')}</span></Link>
        <AvatarMenu />
        </div>
      </div>}
      {session && <div className="mt-1 flex items-center gap-2 border-t border-border/70 pt-0.5">
        <HeaderPlaceNavigation />
      </div>}
    </header>
    {!port&&!harbor&&!tankScreen&&<PlaceBanner pathname={pathname}/>}
    <main className={`flex min-w-0 flex-1 flex-col ${shop||warehouse||memory||friends||exchange||showcase||noticeList||mailbox||home||profile?'-mx-6':expedition?'-mx-3':''} ${port||expedition||tankScreen||harbor||fishing||memory||warehouse||shop||friends||exchange||square||showcase||noticeList||mailbox||home||profile?'min-h-0 overflow-hidden':''}`}><Suspense fallback={<p role="status" className="p-8 text-center text-xs text-muted-foreground">불러오는 중…</p>}><Outlet/></Suspense></main>
  </div>
}
