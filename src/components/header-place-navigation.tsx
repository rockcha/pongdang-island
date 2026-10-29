import {placeGroups} from '@/lib/place-groups'
import {NavigationCategoryIcon} from './navigation-category-icon'
import {useMenuActivity,MenuActivityLine} from './menu-activity'
import {RelicIcon} from '@/components/collection-filter-icons'
import {useEquippedRelic} from '@/features/relics/use-equipped-relic'
import {CollectibleThumbnail} from '@/features/collection/collectible-thumbnail'
import { useSavingsStatus } from '@/features/savings/use-savings-status'
import { Fragment } from 'react'
import { useOperator } from '@/features/notices/use-operator'
import { appArt } from '@/components/app-art'
import { useNewContent } from './use-new-content'

import { Link, useLocation } from 'react-router'
import { Check, House, FishingRod, Factory, BookOpen, NotebookTabs, Clapperboard, Container, Fuel, PackagePlus, Store as StoreOutline, NotebookPen, Sailboat } from 'lucide-react'

import {UserRound,AudioLines,Fish,Shapes,Package,Warehouse as WarehouseOutline,Medal,Gem,Map as MapOutline,ShoppingBasket,ShoppingBag,Flame,Sprout,FlaskConical,Anchor,Ship as ShipOutline,Handshake as TradeIcon,ClipboardList,Landmark,Gamepad2 as GameIcon,TowerControl as LighthouseOutline,MessageSquare,Images,Trophy,Newspaper,Megaphone,Heart,Gift,Mail,Lightbulb,Bug} from 'lucide-react'

import { Menu } from '@base-ui/react/menu'

const {
  island: IslandIcon,
  aquarium: AquariumIcon,
  plaza: PlazaIcon,
  shipyard: Ship,
  shop: Store,
  exchange: Handshake,
  map: Map,
  warehouse: Warehouse,
  arcade: Gamepad2,
  lighthouse: TowerControl,
  savings: Shell,
} = appArt

export const headerPlaces = [
  { to: '/my-island', label: '나의 퐁당섬', icon: appArt.island },
  { to: '/profile', label: '내 정보', icon: appArt.profile },
  { to: '/voyage-bets', label: '만선 승부장', icon: appArt.shipyard },
  { to: '/fishing-records', label: '오늘의 낚시 기록', icon: NotebookPen },
  { to: '/square/notices', label: '공지', icon: appArt.notices },
  { to: '/port', label: '어선 파견', icon: appArt.port },
  { to: '/music-room', label: '음악 감상', icon: appArt.music },
  { to: '/aquarium', label: '아쿠아리움', icon: AquariumIcon },
  { to: '/island-news', label: '퐁당섬 소식', icon: IslandIcon },
  { to: '/development-fund', label: '퐁당섬 발전기금', icon: appArt.developmentFund },
  { to: '/titles', label: '칭호', icon: appArt.title },
  { to: '/relics', label: '유물', icon: RelicIcon },
  { to: '/collection', label: '개체 도감', icon: appArt.collection },
  { to: '/item-collection', label: '아이템 도감', icon: NotebookTabs },
  { to: '/storage', label: '보관함', icon: appArt.storage },
  { to: '/bait-production', label: '미끼 생산소', icon: appArt.baitProduction },
  { to: '/my-bait-production', label: '나만의 미끼 생산소', icon: appArt.baitProduction },
  { to: '/bait-production-shop', label: '미끼 생산소 상점', icon: appArt.baitProductionShop },
  { to: '/production', label: '연료 생산소', icon: appArt.production },
  { to: '/production-shop', label: '연료 생산소 상점', icon: appArt.fuelProductionShop },
  { to: '/collection-animation', label: '애니메이션 도감', icon: Clapperboard },
  { to: '/harbor', label: '지도', icon: Map },
  { to: '/fishing', label: '직접 낚시', icon: appArt.rod },
  { to: '/shop', label: '낚시 상점', icon: Store },
  { to: '/decoration-shop', label: '어항 장식물 상점', icon: appArt.decorationShop },
  { to: '/item-shop', label: '아이템 상점', icon: appArt.itemShop },
  { to: '/shipyard', label: '조선소', icon: Ship },
  { to: '/expeditions', label: '통발', icon: appArt.expeditions },
  { to: '/farm', label: '농장', icon: appArt.farm },
  { to: '/exchange', label: '거래소', icon: Handshake },
  { to: '/flea-market', label: '벼룩시장', icon: Store },
  { to: '/merchant-orders', label: '바다 상인의 의뢰', icon: appArt.merchantOrders },
  { to: '/savings', label: '조개 적금', icon: Shell },
  { to: '/warehouse', label: '창고', icon: Warehouse },
  { to: '/arcade', label: '미니게임', icon: Gamepad2 },
  { to: '/friends', label: '등대', icon: TowerControl },
  { to: '/hall-of-fame', label: '명예의 전당', icon: appArt.ranking },
  { to: '/board', label: '자유게시판', icon: PlazaIcon },
  { to: '/showcase', label: '자랑하기', icon: appArt.showcase },
  { to: '/square/sponsorship', label: '후원소', icon: appArt.mailGift },
  { to: '/square/begging', label: '사연함', icon: appArt.friendInvite },
  { to: '/square/suggestions', label: '건의함', icon: appArt.suggestions },
  { to: '/square/bugs', label: '버그 제보', icon: appArt.bugs },
]

export const menuIcons:Record<string,typeof House>={
 '/voyage-bets':Sailboat,'/fishing-records':NotebookPen,
 '/my-island':House,
 '/profile':UserRound,'/aquarium':Fish,'/music-room':AudioLines,'/decoration-shop':Shapes,
 '/harbor':MapOutline,'/fishing':FishingRod,'/expeditions':Container,'/shop':StoreOutline,'/item-shop':ShoppingBag,
 '/port':Anchor,'/shipyard':ShipOutline,'/production':Flame,'/bait-production':Factory,'/my-bait-production':FlaskConical,'/farm':Sprout,'/production-shop':Fuel,'/bait-production-shop':PackagePlus,
 '/flea-market':ShoppingBasket,'/exchange':TradeIcon,'/merchant-orders':ClipboardList,'/savings':Landmark,'/storage':Package,'/warehouse':WarehouseOutline,'/collection':BookOpen,'/item-collection':NotebookTabs,'/titles':Medal,'/relics':Gem,'/collection-animation':Clapperboard,
 '/friends':LighthouseOutline,'/board':MessageSquare,'/showcase':Images,'/hall-of-fame':Trophy,'/arcade':GameIcon,'/island-news':Newspaper,'/square/notices':Megaphone,'/development-fund':Heart,'/square/sponsorship':Gift,'/square/begging':Mail,'/square/suggestions':Lightbulb,'/square/bugs':Bug,
}

const groups=placeGroups
export function HeaderPlaceNavigation() {
  const equippedRelic=useEquippedRelic()
  const newContent = useNewContent()
  const activity=useMenuActivity()
  const { pathname } = useLocation()
  const savings = useSavingsStatus(),
    { operator } = useOperator()
  const current = /^\/(region|sailing)\//.test(pathname) ? '/fishing' : pathname
  const merchantReady=(activity['/merchant-orders']?.ready??0)>0
  const fleaReady=(activity['/flea-market']?.ready??0)>0
  const hasNewContent=(to:string)=>
    (to==='/board'&&newContent.board)||
    (to==='/showcase'&&newContent.showcase)||
    (to==='/square/suggestions'&&newContent.suggestions)||
    (to==='/square/bugs'&&newContent.bugs)||
    (to==='/exchange'&&newContent.exchange)||
    (to==='/flea-market'&&(newContent.flea||fleaReady))
    ||(to==='/merchant-orders'&&merchantReady)

  return (
    <nav aria-label="장소 바로가기" className="grid w-[224px] max-w-full shrink-0 grid-cols-7 gap-0.5 sm:w-[252px]">
      {groups.map((group) => {
        const items = group.sections.flatMap(section=>section.paths)
          .filter((path) => path !== '/collection-animation' || operator)
          .map((path) => headerPlaces.find((item) => item.to === path)!)
        const selected = items.find(
          (item) => current === item.to || current.startsWith(item.to + '/'),
        )
        const hasActivity=items.some(item=>(item.to!=='/merchant-orders'&&hasNewContent(item.to))||!!activity[item.to]?.ready||(item.to==='/savings'&&!!savings))
        return (
          <Menu.Root key={pathname + group.label}>
            <Menu.Trigger
              aria-label={group.label}
              title={group.label}
              aria-current={selected?'location':undefined}
              aria-description={hasActivity?'새 소식 또는 확인할 항목이 있어요':undefined}
              className={`relative flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-0.5 py-2 outline-none transition-colors hover:bg-secondary/70 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ${selected?'bg-primary/10 text-primary after:absolute after:bottom-0 after:h-0.5 after:w-4 after:rounded-full after:bg-primary':'text-foreground/70'}`}
            >
              <NavigationCategoryIcon category={group.id} className="size-7 shrink-0"/>
              <span className="whitespace-nowrap text-[9px] font-medium leading-3">{group.label}</span>
              {hasActivity&&<span aria-hidden="true" data-category-activity={group.label} className="category-activity-dot absolute right-1 top-1"/>}
            </Menu.Trigger>
            <Menu.Portal>
              <Menu.Positioner
                sideOffset={8}
                align="center"
                collisionPadding={12}
                className="z-[60]"
              >
                <Menu.Popup
                  aria-label={`${group.label} 메뉴`}
                  className="w-64 max-w-[calc(100vw-1.5rem)] origin-[var(--transform-origin)] max-h-[var(--available-height)] overflow-y-auto overscroll-contain rounded-xl border border-border/60 bg-popover p-1.5 text-popover-foreground shadow-lg shadow-black/10 outline-none"
                >
                  {items.map(({ to, label, icon: ItemIcon }) => {
                    const ItemOutline=menuIcons[to]??ItemIcon
                    const active = selected?.to === to
                    const heading=group.sections.find(section=>section.paths[0]===to)?.label
                    return (
                     <Fragment key={to}>
                      {heading&&<>{to!==items[0].to&&<Menu.Separator className="mx-3 my-1.5 h-px bg-border/60"/>}<p className="px-3 pb-1 pt-2 text-[10px] font-medium tracking-wide text-muted-foreground/75">{heading}</p></>}
                      <Menu.LinkItem
                        key={to}
                        render={<Link to={to} aria-current={active ? 'page' : undefined} />}
                        className={`flex min-h-11 items-center ${to==='/relics'?'gap-2':'gap-3'} rounded-lg px-3 py-2 text-sm outline-none transition-colors data-highlighted:bg-secondary ${active ? 'bg-primary/10 text-primary' : 'text-foreground'}`}
                      >
                        <span className="relative grid size-8 shrink-0 place-items-center">
                          <ItemOutline aria-hidden="true" className="size-5 text-primary/80" strokeWidth={1.7}/>
                        </span>
                        <span className="min-w-0 flex-1"><span className="block truncate">{label}</span>{activity[to]&&<MenuActivityLine activity={activity[to]}/>}</span>
                        {to==='/relics'&&equippedRelic&&<span className="flex max-w-20 shrink-0 items-center gap-1" title={`장착 중: ${equippedRelic.name}`}><CollectibleThumbnail path={equippedRelic.thumbnail_path} name={`장착 중: ${equippedRelic.name}`} className="size-6 shrink-0"/><span className="min-w-0 truncate text-[10px]">{equippedRelic.name}</span></span>}
                        {hasNewContent(to) && (
                          <span
                            aria-label={to==='/merchant-orders'?'납품 가능한 의뢰 있음':to==='/flea-market'&&fleaReady?'판매 가능한 구매글 있음':'새 글 있음'}
                            className="text-[9px] font-bold tracking-wider text-rose-600 dark:text-rose-400"
                          >
                            NEW
                          </span>
                        )}
                        {to === '/collection-animation' && (
                          <span className="shrink-0 rounded bg-primary/10 px-1.5 py-1 text-[10px] text-primary">
                            운영자
                          </span>
                        )}
                        {to === '/farm' && (
                          <span className="shrink-0 text-[10px] text-muted-foreground">
                            준비 중
                          </span>
                        )}
                        {to === '/savings' && savings && (
                          <span className="shrink-0 rounded bg-primary/10 px-1.5 py-1 text-[10px] text-primary">
                            {savings}
                          </span>
                        )}
                        {active && <Check aria-label="현재 위치" className="size-4 shrink-0" />}
                      </Menu.LinkItem>
                     </Fragment>
                    )
                  })}
                </Menu.Popup>
              </Menu.Positioner>
            </Menu.Portal>
          </Menu.Root>
        )
      })}
    </nav>
  )
}
