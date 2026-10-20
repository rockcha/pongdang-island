import { useSavingsStatus } from '@/features/savings/use-savings-status'
import { useHarborStatus } from '@/features/port/use-harbor-status'
import { useOperator } from '@/features/notices/use-operator'
import { appArt } from '@/components/app-art'

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
  { to: '/', label: '내 퐁당섬', icon: IslandIcon },
  { to: '/aquarium', label: '아쿠아리움', icon: AquariumIcon },
  { to: '/titles', label: '칭호', icon: appArt.title },
  { to: '/collection', label: '도감', icon: appArt.collection },
  { to: '/collection-animation', label: '애니메이션 도감', icon: appArt.collection },
  { to: '/harbor', label: '지도', icon: Map },
  { to: '/shop', label: '낚시 상점', icon: Store },
  { to: '/item-shop', label: '아이템 상점', icon: appArt.itemShop },
  { to: '/shipyard', label: '조선소', icon: Ship },
  { to: '/expeditions', label: '통발 설치', icon: appArt.expeditions },
  { to: '/farm', label: '농장', icon: appArt.farm },
  { to: '/exchange', label: '거래소', icon: Handshake },
  { to: '/savings', label: '조개 적금', icon: Shell },
  { to: '/warehouse', label: '창고', icon: Warehouse },
  { to: '/arcade', label: '게임', icon: Gamepad2 },
  { to: '/friends', label: '등대', icon: TowerControl },
  { to: '/board', label: '자유게시판', icon: PlazaIcon },
  { to: '/square/notices', label: '공지', icon: appArt.notices },
  { to: '/square/suggestions', label: '건의함', icon: appArt.suggestions },
  { to: '/square/bugs', label: '버그 제보', icon: appArt.bugs },
]

export function HeaderPlaceNavigation() {
  const { pathname } = useLocation()
  const harbor = useHarborStatus(),
    savings = useSavingsStatus(),
    { operator } = useOperator()
  const current = /^\/(region|sailing)\//.test(pathname) ? '/harbor' : pathname
  const groups = [
    {
      label: '내 섬',
      paths: ['/', '/aquarium', '/warehouse', '/collection', '/titles', '/collection-animation'],
    },
    { label: '바다', paths: ['/harbor', '/port', '/shipyard'] },
    { label: '장터', paths: ['/shop', '/item-shop', '/exchange', '/savings'] },
    { label: '놀이터', paths: ['/arcade', '/music-room', '/farm'] },
    {
      label: '소셜',
      paths: ['/friends', '/board', '/square/notices', '/square/suggestions', '/square/bugs'],
    },
  ]
  return (
    <nav aria-label="장소 바로가기" className="grid min-w-0 flex-1 grid-cols-5 gap-0">
      {groups.map((group) => {
        const items = group.paths
          .filter((path) => path !== '/collection-animation' || operator)
          .map((path) => headerPlaces.find((item) => item.to === path)!)
        const selected = items.find(
          (item) => current === item.to || current.startsWith(item.to + '/'),
        )
        return (
          <Menu.Root key={pathname + group.label}>
            <Menu.Trigger
              aria-label={group.label}
              className={`group flex min-h-9 min-w-0 items-center justify-center px-1 py-1 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring data-popup-open:text-primary ${selected ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <span className="flex items-center gap-1 text-xs font-medium">
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
                  className="w-56 max-w-[calc(100vw-1.5rem)] origin-[var(--transform-origin)] overflow-hidden rounded-xl border border-border/60 bg-popover p-1.5 text-popover-foreground shadow-lg shadow-black/10 outline-none"
                >
                  {items.map(({ to, label, icon: ItemIcon }) => {
                    const active = selected?.to === to
                    return (
                      <Menu.LinkItem
                        key={to}
                        render={<Link to={to} aria-current={active ? 'page' : undefined} />}
                        className={`flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm outline-none transition-colors data-highlighted:bg-secondary ${active ? 'bg-primary/10 text-primary' : 'text-foreground'}`}
                      >
                        <span className="grid size-8 shrink-0 place-items-center">
                          <ItemIcon aria-hidden="true" className="size-7" />
                        </span>
                        <span className="flex-1 whitespace-nowrap">{label}</span>
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
                        {to === '/savings' && savings && (
                          <span className="shrink-0 rounded bg-primary/10 px-1.5 py-1 text-[10px] text-primary">
                            {savings}
                          </span>
                        )}
                        {active && <Check aria-label="현재 위치" className="size-4 shrink-0" />}
                      </Menu.LinkItem>
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
