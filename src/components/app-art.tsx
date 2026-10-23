import type {ComponentProps} from 'react'
import {Cog,Store} from 'lucide-react'

function artwork(name:string,folder='app-icons',extension='png'){
 return function Artwork({className='size-6',strokeWidth:_strokeWidth,...props}:Omit<ComponentProps<'img'>,'src'|'alt'>&{strokeWidth?:number}){
  return <img {...props} onError={event=>{if(event.currentTarget.dataset.fallback)return;event.currentTarget.dataset.fallback='true';event.currentTarget.src='/fallback-image.svg'}} src={`/${folder}/${name}.${extension}`} alt="" aria-hidden={props['aria-hidden']??true} width={128} height={128} decoding="async" draggable={false} className={`${className} shrink-0 object-contain`}/>
 }
}
function productionArtwork(kind:'bait'|'fuel',shop=false){
 const Resource=kind==='bait'?artwork('bait'):artwork('fuel-can','app-icons','svg')
 const Badge=shop?Store:Cog
 return function ProductionArtwork({className='size-6'}:{className?:string;strokeWidth?:number}){
  return <span aria-hidden="true" className={`relative inline-block shrink-0 ${className}`}><Resource className="size-full"/><Badge className="absolute -bottom-0.5 -right-0.5 size-[45%] rounded-full bg-background p-px text-primary" strokeWidth={2.3}/></span>
 }
}
export const appArt={
 production:productionArtwork('fuel'),
 baitProduction:productionArtwork('bait'),
 baitProductionShop:productionArtwork('bait',true),
 fuelProductionShop:productionArtwork('fuel',true),
 showcase:artwork('showcase-fish-trophy'),
 download:artwork('download-orange'),
 backToList:artwork('back-to-list'),
 itemShop:artwork('item-shop'),
 port:artwork('port'),fuel:artwork('fuel-can','app-icons','svg'),
 music:artwork('music-disc-cartoon'),
 fishingTips:artwork('fishing-tips','app-icons','svg'),
 farm:artwork('farm'),
 expeditionBoost:artwork('fish-trap'),
 noticeGuide:artwork('notice-guide'),noticeUpdate:artwork('notice-update'),noticeMaintenance:artwork('notice-maintenance'),noticeEvent:artwork('notice-event'),
 all:artwork('all'),
 title:artwork('title'),
 empty:artwork('empty'),
 camera:artwork('camera'),logout:artwork('logout'),
 gameplay:artwork('gameplay'),ranking:artwork('ranking'),
 friendInvite:artwork('friend-invite'),friendRemove:artwork('friend-remove'),friendRequest:artwork('friend-request','notification-icons'),
 fish:artwork('kind-fish'),decoration:artwork('kind-decoration'),trash:artwork('kind-trash'),
 attendance:artwork('attendance'),alerts:artwork('alerts'),mailNotice:artwork('mail-notice'),mailFriend:artwork('mail-friend'),mailNews:artwork('mail-news'),mailGift:artwork('mail-gift'),
 island:artwork('island'),aquarium:artwork('aquarium'),map:artwork('map'),shop:artwork('shop'),
 shipyard:artwork('shipyard'),expeditions:artwork('fish-trap'),exchange:artwork('exchange'),merchantOrders:artwork('sea-merchant-orders'),
 savings:artwork('savings'),warehouse:artwork('warehouse'),arcade:artwork('arcade'),
 lighthouse:artwork('lighthouse'),mailbox:artwork('mailbox'),plaza:artwork('plaza'),
 list:artwork('list'),storage:artwork('storage'),theme:artwork('theme'),background:artwork('aquarium-background'),collection:artwork('collection-v2'),
 bait:artwork('bait'),rod:artwork('rod'),profile:artwork('profile-sailor'),settings:artwork('settings'),
 notices:artwork('announcement','notification-icons'),suggestions:artwork('suggestion','notification-icons'),bugs:artwork('bug','notification-icons'),
}
const placeArt:Record<string,ReturnType<typeof artwork>>={
 '/production':appArt.production,
 '/bait-production':appArt.baitProduction,
 '/bait-production-shop':appArt.baitProductionShop,
 '/production-shop':appArt.fuelProductionShop,
 '/hall-of-fame':appArt.ranking,
 '/showcase':appArt.showcase,
 '/item-shop':appArt.itemShop,
 '/merchant-orders':appArt.merchantOrders,
 '/port':appArt.port,
 '/music-room':appArt.music,
 '/':appArt.island,'/aquarium':appArt.aquarium,'/harbor':appArt.map,'/shop':appArt.shop,'/farm':appArt.farm,
 '/shipyard':appArt.shipyard,'/expeditions':appArt.expeditions,'/exchange':appArt.exchange,
 '/storage':appArt.storage,'/savings':appArt.savings,'/warehouse':appArt.warehouse,'/arcade':appArt.arcade,'/friends':appArt.lighthouse,
 '/notifications':appArt.mailbox,'/board':appArt.plaza,'/square':appArt.plaza,'/square/notices':appArt.notices,
 '/square/suggestions':appArt.suggestions,'/square/bugs':appArt.bugs,'/profile':appArt.profile,'/profile/settings':appArt.settings,
}
export function placeArtwork(pathname:string){return placeArt[pathname]??Object.entries(placeArt).filter(([path])=>path!=='/'&&pathname.startsWith(path+'/')).sort(([a],[b])=>b.length-a.length)[0]?.[1]}
