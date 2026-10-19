import { LandscapeImage } from './landscape-image'
import { placeSections } from '@/lib/place-sections'
import { arcadeGames } from '@/features/arcade/games'
import {squareDestinations} from '@/lib/square-destinations'
import {BannerBreadcrumb} from './banner-breadcrumb'
import {BannerInfo,bannerGuide} from './banner-info'

export const placeBanners:Record<string,{title:string;image:string;description:string;subtitle:string}>={
 '/collection':{title:'도감',image:'collection',description:'바다 생물을 기록하는 햇살 가득한 해양 관찰실',subtitle:'만난 바다 친구들을 한 장씩 기록해요'},
 '/collection-animation':{title:'애니메이션 도감',image:'collection',description:'바다 생물을 기록하는 햇살 가득한 해양 관찰실',subtitle:'개체를 눌러 움직이는 모습을 확인해요'},
 '/titles':{title:'칭호',image:'titles',description:'바다에서 쌓은 추억을 간직한 기념패 선반',subtitle:'나의 바다 이야기에 이름을 붙여요'},
 '/shipyard':{title:'조선소',image:'harbor',description:'어선이 쉬어 가는 항구',subtitle:'나만의 어선과 다음 항해를 준비해요'},
 '/expeditions':{title:'어선 파견',image:'harbor',description:'어선이 출항하는 항구',subtitle:'미끼를 맡기고 기다리는 바다의 선물'},
 '/savings':{title:'조개 적금',image:'shell-savings',description:'바다가 보이는 작은 저금소의 진주빛 조개 저금통',subtitle:'하루 한 번, 차곡차곡 모으는 골드'},
 '/arcade':{title:'오락실',image:'arcade',description:'바다가 보이는 창문과 작은 게임기들이 있는 따뜻한 섬 오락실',subtitle:'잠깐의 놀이, 작은 즐거움'},
 '/warehouse':{title:'창고',image:'warehouse',description:'낚싯대와 미끼가 가지런히 보관된 따뜻한 해변 창고 내부',subtitle:'다음 항해를 위한 작은 준비'},
 '/shop':{title:'상점',image:'merchant-shop',description:'낚싯대와 미끼가 진열된 따뜻한 상점 내부',subtitle:'미끼부터 나만의 낚싯대까지'},
 '/':{title:'퐁당 섬',image:'island',description:'잔잔한 바다와 작은 집들이 반기는 퐁당 섬',subtitle:'섬에서의 하루가 시작되는 곳'},
 '/harbor':{title:'지도',image:'harbor',description:'새로운 바다로 향하는 섬의 항로',subtitle:'새로운 바다로 떠나는 곳'},
 '/friends':{title:'등대',image:'lighthouse',description:'바다를 바라보는 언덕 위 작은 등대',subtitle:'친구를 만나고 인연을 이어가는 곳'},
 '/notifications':{title:'우편함',image:'mailbox',description:'편지와 섬의 소식이 도착하는 해변 우편함',subtitle:'친구와 섬에서 도착한 소식과 선물'},
 '/square':{title:'광장',image:'square',description:'게시판과 작은 집들이 둘러선 섬의 광장',subtitle:placeSections.square.description},
 '/exchange':{title:'거래소',image:'merchant-exchange',description:'청록 차양과 저울이 놓인 바닷가 거래소',subtitle:'필요한 물건을 서로 거래해요'},
}

export function PlaceBanner({pathname}:{pathname:string}){
 const section=Object.values(placeSections).find(place=>pathname===place.path||pathname.startsWith(`${place.path}/`))
 const square=squareDestinations.find(item=>pathname===item.path||pathname.startsWith(`${item.path}/`))
 const visit=pathname.startsWith('/friends/')
 const expeditionVisit=visit&&pathname.endsWith('/expeditions')
 const base=placeBanners[expeditionVisit?'/expeditions':visit?'/friends':pathname.startsWith('/arcade/')?'/arcade':section?.path??pathname]
 const banner=square?{title:square.bannerTitle,image:square.banner,description:square.description,subtitle:''}:base
 const game=pathname.startsWith('/arcade/')?arcadeGames.find(item=>pathname===`/arcade/${item.id}`):undefined
 const compact=visit||!!square||pathname.startsWith('/arcade/')
 if(!banner)return null
 const src=`/banners/${banner.image}.png`
 return <div role="region" onDragStart={event=>event.preventDefault()} className={`relative ${pathname==='/aquarium'?'':'-mx-6'} ${pathname.startsWith('/arcade/')?'aspect-[3/1]':pathname==='/expeditions'?'h-[clamp(64px,11dvh,96px)]':compact?'h-[clamp(80px,16dvh,128px)]':'h-[120px]'} shrink-0 select-none overflow-hidden bg-secondary`} aria-labelledby="place-banner-title">
  <LandscapeImage key={src} src={src} alt={banner.description} width={1536} height={512} fetchPriority="high" decoding="async" className={`absolute inset-0 h-full w-full object-center ${compact&&!square?'object-contain':'object-cover'}`}/>
  <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(0deg,rgba(45,28,20,0.88)_0%,rgba(45,28,20,0.50)_45%,rgba(45,28,20,0.04)_100%)]" aria-hidden="true"/>
  <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(45,28,20,0.30),transparent_80%)]" aria-hidden="true"/>
  <div className="absolute inset-x-6 bottom-4 space-y-1 text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.55)]"><div className="flex items-center gap-1"><h1 id="place-banner-title" className="min-w-0 text-xl font-normal tracking-tight">{visit?<BannerBreadcrumb parent="등대" to="/friends" title={expeditionVisit?'친구 어선 파견':'친구 아쿠아리움'}/>:square?<BannerBreadcrumb parent="광장" to="/square" title={square.bannerTitle}/>:game?<BannerBreadcrumb parent={placeBanners['/arcade'].title} to="/arcade" title={game.title}/>:banner.title}</h1><BannerInfo key={pathname} title={visit?(expeditionVisit?'친구 어선 파견':'친구 아쿠아리움'):game?.title??banner.title} steps={bannerGuide(pathname)}/></div>{!compact&&<p className="text-xs leading-5 text-white">{banner.subtitle}</p>}</div>
 </div>
}
