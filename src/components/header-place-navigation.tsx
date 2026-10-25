import {RelicIcon} from '@/components/collection-filter-icons'
import { useSavingsStatus } from '@/features/savings/use-savings-status'
import { useProductionMenuStatus } from '@/features/production/use-production-menu-status'
import { useHarborStatus } from '@/features/port/use-harbor-status'
import { useExpeditionStatus } from '@/features/expeditions/use-expedition-status'
import { Fragment } from 'react'
import { useOperator } from '@/features/notices/use-operator'
import { appArt } from '@/components/app-art'
import { useNewContent } from './use-new-content'

import { Link, useLocation } from 'react-router'
import { ChevronDown, Check } from 'lucide-react'

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
  { to: '/port', label: '항구', icon: appArt.port },
  { to: '/music-room', label: '음악 감상', icon: appArt.music },
  { to: '/aquarium', label: '아쿠아리움', icon: AquariumIcon },
  { to: '/island-news', label: '퐁당섬 소식', icon: IslandIcon },
  { to: '/titles', label: '칭호', icon: appArt.title },
  { to: '/relics', label: '유물', icon: RelicIcon },
  { to: '/collection', label: '도감', icon: appArt.collection },
  { to: '/storage', label: '보관함', icon: appArt.storage },
  { to: '/bait-production', label: '미끼 생산소', icon: appArt.baitProduction },
  { to: '/my-bait-production', label: '나만의 미끼 생산소', icon: appArt.baitProduction },
  { to: '/bait-production-shop', label: '미끼 생산소 상점', icon: appArt.baitProductionShop },
  { to: '/production', label: '연료 생산소', icon: appArt.production },
  { to: '/production-shop', label: '연료 생산소 상점', icon: appArt.fuelProductionShop },
  { to: '/collection-animation', label: '애니메이션 도감', icon: appArt.collection },
  { to: '/harbor', label: '지도', icon: Map },
  { to: '/fishing', label: '낚시', icon: appArt.rod },
  { to: '/shop', label: '낚시 상점', icon: Store },
  { to: '/item-shop', label: '아이템 상점', icon: appArt.itemShop },
  { to: '/shipyard', label: '조선소', icon: Ship },
  { to: '/expeditions', label: '통발', icon: appArt.expeditions },
  { to: '/farm', label: '농장', icon: appArt.farm },
  { to: '/exchange', label: '거래소', icon: Handshake },
  { to: '/merchant-orders', label: '바다 상인의 의뢰', icon: appArt.merchantOrders },
  { to: '/savings', label: '조개 적금', icon: Shell },
  { to: '/warehouse', label: '창고', icon: Warehouse },
  { to: '/arcade', label: '게임', icon: Gamepad2 },
  { to: '/friends', label: '등대', icon: TowerControl },
  { to: '/hall-of-fame', label: '명예의 전당', icon: appArt.ranking },
  { to: '/board', label: '자유게시판', icon: PlazaIcon },
  { to: '/showcase', label: '자랑하기', icon: appArt.showcase },
  { to: '/square/suggestions', label: '건의함', icon: appArt.suggestions },
  { to: '/square/bugs', label: '버그 제보', icon: appArt.bugs },
]

export function HeaderPlaceNavigation() {
  const newContent = useNewContent()
  const fuelProduction = useProductionMenuStatus('fuel')
  const baitProduction = useProductionMenuStatus('bait')
  const productionStatus = (to: string) => to === '/production' ? fuelProduction : to === '/bait-production' ? baitProduction : null
  const { pathname } = useLocation()
  const harbor = useHarborStatus(),
    expedition = useExpeditionStatus(),
    savings = useSavingsStatus(),
    { operator } = useOperator()
  const current = /^\/(region|sailing)\//.test(pathname) ? '/fishing' : pathname
  const hasNewContent=(to:string)=>
    (to==='/board'&&newContent.board)||
    (to==='/showcase'&&newContent.showcase)||
    (to==='/square/suggestions'&&newContent.suggestions)||
    (to==='/square/bugs'&&newContent.bugs)||
    (to==='/exchange'&&newContent.exchange)
  const groups = [
  {
    "label": "내 섬",
    "sections": [
      {
        "label": "나의 공간",
        "paths": [
          "/aquarium",
          "/island-news"
        ]
      },
      {
        "label": "보관·수집",
        "paths": [
          "/storage",
          "/collection",
          "/titles",
          "/relics",
          "/collection-animation"
        ]
      }
    ]
  },
  {
    "label": "바다",
    "sections": [
      {
        "label": "직접 낚시",
        "paths": [
          "/harbor",
          "/fishing"
        ]
      },
      {
        "label": "맡겨 두는 낚시",
        "paths": [
          "/expeditions",
          "/port",
          "/shipyard"
        ]
      }
    ]
  },
  {
    "label": "생활",
    "sections": [
      {
        "label": "생산·재배",
        "paths": [
          "/production",
          "/bait-production",
          "/my-bait-production",
          "/farm"
        ]
      },
      {
        "label": "물품·골드 관리",
        "paths": [
          "/warehouse",
          "/savings"
        ]
      }
    ]
  },
  {
    "label": "장터",
    "sections": [
      {
        "label": "물품 구매",
        "paths": [
          "/shop",
          "/item-shop"
        ]
      },
      {
        "label": "시설 구매",
        "paths": [
          "/bait-production-shop",
          "/production-shop"
        ]
      },
      {
        "label": "거래·의뢰",
        "paths": [
          "/exchange",
          "/merchant-orders"
        ]
      }
    ]
  },
  {
    "label": "광장",
    "sections": [
      {
        "label": "함께 이야기",
        "paths": [
          "/friends",
          "/showcase",
          "/board"
        ]
      },
      {
        "label": "즐길거리·기록",
        "paths": [
          "/arcade",
          "/music-room",
          "/hall-of-fame"
        ]
      },
      {
        "label": "운영팀에게",
        "paths": [
          "/square/suggestions",
          "/square/bugs"
        ]
      }
    ]
  }
]

  return (
    <nav aria-label="장소 바로가기" className="grid min-w-0 flex-1 grid-cols-5 gap-0">
      {groups.map((group) => {
        const items = group.sections.flatMap(section=>section.paths)
          .filter((path) => path !== '/collection-animation' || operator)
          .map((path) => headerPlaces.find((item) => item.to === path)!)
        const selected = items.find(
          (item) => current === item.to || current.startsWith(item.to + '/'),
        )
        const hasActivity=items.some(item=>hasNewContent(item.to)||!!productionStatus(item.to)?.ready||(item.to==='/port'&&!!harbor?.ready)||(item.to==='/expeditions'&&expedition==='returned')||(item.to==='/savings'&&!!savings))
        return (
          <Menu.Root key={pathname + group.label}>
            <Menu.Trigger
              aria-label={group.label}
              aria-current={selected?'location':undefined}
              aria-description={hasActivity?'새 소식 또는 확인할 항목이 있어요':undefined}
              className={`group relative my-1 mx-0.5 flex min-h-9 min-w-0 items-center justify-center rounded-lg px-1 py-1 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring data-popup-open:text-primary ${selected ? 'bg-primary/10 text-primary after:absolute after:bottom-0 after:h-0.5 after:w-5 after:rounded-full after:bg-primary' : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground'}`}
            >
              <span className={`flex items-center gap-1 text-xs ${selected?'font-semibold':'font-medium'}`}>
                {hasActivity&&<span aria-hidden="true" data-category-activity={group.label} className="category-activity-dot"/>}
                {group.label}
                <ChevronDown
                  aria-hidden="true"
                  className="size-3 shrink-0 opacity-40 transition-transform group-data-popup-open:rotate-180"
                />
              </span>
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
                  className="w-56 max-w-[calc(100vw-1.5rem)] origin-[var(--transform-origin)] max-h-[var(--available-height)] overflow-y-auto overscroll-contain rounded-xl border border-border/60 bg-popover p-1.5 text-popover-foreground shadow-lg shadow-black/10 outline-none"
                >
                  {items.map(({ to, label, icon: ItemIcon }) => {
                    const active = selected?.to === to
                    const heading=group.sections.find(section=>section.paths[0]===to)?.label
                    return (
                     <Fragment key={to}>
                      {heading&&<>{to!==items[0].to&&<Menu.Separator className="mx-3 my-1.5 h-px bg-border/60"/>}<p className="px-3 pb-1 pt-2 text-[10px] font-medium tracking-wide text-muted-foreground/75">{heading}</p></>}
                      <Menu.LinkItem
                        key={to}
                        render={<Link to={to} aria-current={active ? 'page' : undefined} />}
                        className={`flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm outline-none transition-colors data-highlighted:bg-secondary ${active ? 'bg-primary/10 text-primary' : 'text-foreground'}`}
                      >
                        <span className="grid size-8 shrink-0 place-items-center">
                          <ItemIcon aria-hidden="true" className="size-7" />
                        </span>
                        <span className="flex-1 whitespace-nowrap">{label}</span>
                        {!!productionStatus(to)?.total && (
                          <span className={`flex shrink-0 items-center gap-1 rounded px-1.5 py-1 text-[10px] tabular-nums ${productionStatus(to)?.ready ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                            {!!productionStatus(to)?.ready && <span aria-hidden="true" className="category-activity-dot" />}
                            완료 {productionStatus(to)!.ready}곳
                          </span>
                        )}
                        {hasNewContent(to) && (
                          <span
                            aria-label="새 글 있음"
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
                        {to === '/port' && !!harbor?.ready && (
                          <span className="shrink-0 rounded bg-primary/10 px-1.5 py-1 text-[10px] tabular-nums text-primary">
                            수령 가능 ({harbor.ready}/{harbor.total})
                          </span>
                        )}
                        {to === '/expeditions' && expedition === 'returned' && (
                          <span className="shrink-0 rounded bg-primary/10 px-1.5 py-1 text-[10px] text-primary">수거 대기 중</span>
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
