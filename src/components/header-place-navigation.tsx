import { Link, useLocation } from 'react-router'
import { Map, Fish, Warehouse, Gamepad2, TowerControl, Building2, ShoppingBag } from 'lucide-react'
import { IslandIcon } from './island-icon'
import { placeSections } from '@/lib/place-sections'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip'

export const headerPlaces=[
 {to:'/',label:'퐁당 섬',icon:IslandIcon},
 {to:'/aquarium',label:'아쿠아리움',icon:Fish},
 {to:'/harbor',label:'지도',icon:Map},
 {to:'/warehouse',label:'창고',icon:Warehouse},
 {to:'/arcade',label:'오락실',icon:Gamepad2},
 {to:'/friends',label:'등대',icon:TowerControl},
 {to:placeSections.square.path,label:'광장',icon:Building2},
 {to:placeSections.merchants.path,label:'상인거리',icon:ShoppingBag},
]

export function HeaderPlaceNavigation() {
  const { pathname } = useLocation()
  return <TooltipProvider><nav aria-label="장소 바로가기" className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto py-1">
    {headerPlaces.map(({ to, label, icon: Icon }) => {
      const active = pathname === to || (to !== '/' && pathname.startsWith(`${to}/`)) || (to === placeSections.merchants.path && placeSections.merchants.items.some(item => item.path === pathname))
      return <Tooltip key={to}><TooltipTrigger render={<Link to={to} aria-label={label} aria-current={active ? 'page' : undefined} />} className={`flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${active ? 'bg-primary/10 text-primary' : 'text-muted-foreground'}`}><Icon className="size-[18px]" /></TooltipTrigger><TooltipContent>{label}</TooltipContent></Tooltip>
    })}
  </nav></TooltipProvider>
}
