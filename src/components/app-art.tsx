import type {ComponentProps} from 'react'

function artwork(name:string,folder='app-icons'){
 return function Artwork({className='size-6',strokeWidth:_strokeWidth,...props}:Omit<ComponentProps<'img'>,'src'|'alt'>&{strokeWidth?:number}){
  return <img {...props} onError={event=>{if(event.currentTarget.dataset.fallback)return;event.currentTarget.dataset.fallback='true';event.currentTarget.src='/fallback-image.svg'}} src={`/${folder}/${name}.png`} alt="" aria-hidden={props['aria-hidden']??true} width={128} height={128} decoding="async" draggable={false} className={`${className} shrink-0 object-contain`}/>
 }
}
export const appArt={
 port:artwork('port'),fuel:artwork('fuel'),
 music:artwork('music-disc-cartoon'),
 farm:artwork('farm'),
 expeditionBoost:artwork('expedition-boost','notification-icons'),
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
 shipyard:artwork('shipyard'),expeditions:artwork('expeditions'),exchange:artwork('exchange'),
 savings:artwork('savings'),warehouse:artwork('warehouse'),arcade:artwork('arcade'),
 lighthouse:artwork('lighthouse'),mailbox:artwork('mailbox'),plaza:artwork('plaza'),
 list:artwork('list'),storage:artwork('storage'),theme:artwork('theme'),collection:artwork('collection-v2'),
 bait:artwork('bait'),rod:artwork('rod'),profile:artwork('profile'),settings:artwork('settings'),
 notices:artwork('announcement','notification-icons'),suggestions:artwork('suggestion','notification-icons'),bugs:artwork('bug','notification-icons'),
}
const placeArt:Record<string,ReturnType<typeof artwork>>={
 '/port':appArt.port,
 '/music-room':appArt.music,
 '/':appArt.island,'/aquarium':appArt.aquarium,'/harbor':appArt.map,'/shop':appArt.shop,'/farm':appArt.farm,
 '/shipyard':appArt.shipyard,'/expeditions':appArt.expeditions,'/exchange':appArt.exchange,
 '/savings':appArt.savings,'/warehouse':appArt.warehouse,'/arcade':appArt.arcade,'/friends':appArt.lighthouse,
 '/notifications':appArt.mailbox,'/square':appArt.plaza,'/square/notices':appArt.notices,
 '/square/suggestions':appArt.suggestions,'/square/bugs':appArt.bugs,'/profile':appArt.profile,'/profile/settings':appArt.settings,
}
export function placeArtwork(pathname:string){return placeArt[pathname]??Object.entries(placeArt).filter(([path])=>path!=='/'&&pathname.startsWith(path+'/')).sort(([a],[b])=>b.length-a.length)[0]?.[1]}
