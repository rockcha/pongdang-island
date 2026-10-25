import { BackToListLink } from './back-to-list-link'
import { Link } from 'react-router'
import { appArt } from './app-art'
import { LandscapeImage } from './landscape-image'
import { placeSections } from '@/lib/place-sections'
import { arcadeGames } from '@/features/arcade/games'
import { squareDestinations } from '@/lib/square-destinations'
import { BannerBreadcrumb } from './banner-breadcrumb'
import { BannerInfo, bannerGuide } from './banner-info'

export const placeBanners: Record<
  string,
  { title: string; image: string; description: string; subtitle: string }
> = {
  '/my-bait-production': {title:'나만의 미끼 생산소',image:'my-bait-production',description:'바다가 보이는 작은 공방에서 미끼를 빚는 퐁이',subtitle:'나의 낚시를 위한, 나만의 작은 공방'},
  '/bait-production': {title:'미끼 생산소',image:'production',description:'연료의 온기로 낚시 미끼를 준비하는 바닷가 공방',subtitle:'작은 온기를 담아, 다음 낚시를 준비해요'},
  '/bait-production-shop': {title:'미끼 생산소 상점',image:'production-shop',description:'나만의 미끼 공방을 마련하는 따뜻한 시설 상점',subtitle:'나의 낚시에 어울리는 공방을 만나요'},
  '/production': {title:'연료 생산소',image:'production',description:'바다를 바라보는 작은 재활용 공방과 따뜻한 가마',subtitle:'바다의 자원을 모아, 다음 항해의 힘으로'},
  '/production-shop': {title:'연료 생산소 상점',image:'production-shop',description:'작은 화덕과 압축기가 가지런히 진열된 바닷가 설비 가게',subtitle:'나의 섬에 어울리는 작은 공방을 만나요'},
  '/hall-of-fame': {title:'명예의 전당',image:'lighthouse',description:'등대 곁에서 함께 기리는 퐁당섬의 기록',subtitle:'낚싯대 끝에 쌓인, 우리들의 이야기'},
  '/showcase': {title:'자랑하기',image:'community-board',description:'바다의 특별한 순간을 나누는 게시판',subtitle:'특급과 신화, 그 순간을 함께 나눠요'},
  '/board': {
    title: '자유게시판',
    image: 'community-board',
    description: '해변 게시판 앞에서 이야기를 나누는 퐁이들',
    subtitle: '퐁당섬의 이야기를 나눠요',
  },
  '/port': {
    title: '항구',
    image: 'harbor',
    description: '나만의 배가 쉬어 가는 퐁당섬 선착장',
    subtitle: '작은 배와 함께하는 느긋한 낚시',
  },
  '/music-room': {
    title: '음악 감상',
    image: 'music-room',
    description: '바다가 보이는 창가에 턴테이블과 레코드가 놓인 아늑한 음악 공간',
    subtitle: '좋아하는 음악과 함께 쉬어 가요',
  },
  '/collection': {
    title: '도감',
    image: 'collection',
    description: '바다 생물을 기록하는 햇살 가득한 해양 관찰실',
    subtitle: '만난 바다 친구들을 한 장씩 기록해요',
  },
  '/storage': {
    title: '보관함',
    image: 'storage',
    description: '바다에서 만난 친구와 보물을 간직하는 햇살 가득한 보관실',
    subtitle: '소중한 만남을 보관하고 나누는 곳',
  },
  '/collection-animation': {
    title: '애니메이션 도감',
    image: 'collection',
    description: '바다 생물을 기록하는 햇살 가득한 해양 관찰실',
    subtitle: '개체를 눌러 움직이는 모습을 확인해요',
  },
  '/relics': {title:'유물',image:'collection',description:'바다의 발견을 간직하는 해양 관찰실',subtitle:'발견한 유물로 나의 낚시를 준비해요'},
  '/titles': {
    title: '칭호',
    image: 'titles',
    description: '바다에서 쌓은 추억을 간직한 기념패 선반',
    subtitle: '나의 바다 이야기에 이름을 붙여요',
  },
  '/shipyard': {
    title: '조선소',
    image: 'harbor',
    description: '항구에서 조업할 배를 만드는 조선소',
    subtitle: '항구에서 함께할 나만의 배를 만나요',
  },
  '/expeditions': {
    title: '통발 설치',
    image: 'harbor',
    description: '미끼로 물고기를 유인하는 통발터',
    subtitle: '미끼를 맡기고 기다리는 바다의 선물',
  },
  '/savings': {
    title: '조개 적금',
    image: 'shell-savings',
    description: '바다가 보이는 작은 저금소의 진주빛 조개 저금통',
    subtitle: '하루 한 번, 차곡차곡 모으는 골드',
  },
  '/arcade': {
    title: '오락실',
    image: 'arcade',
    description: '바다가 보이는 창문과 작은 게임기들이 있는 따뜻한 섬 오락실',
    subtitle: '잠깐의 놀이, 작은 즐거움',
  },
  '/warehouse': {
    title: '창고',
    image: 'warehouse',
    description: '낚싯대와 미끼가 가지런히 보관된 따뜻한 해변 창고 내부',
    subtitle: '다음 항해를 위한 작은 준비',
  },
  '/item-shop': {
    title: '아이템 상점',
    image: 'item-shop',
    description: '연료통과 항해 지도가 진열된 포근한 해변 잡화점',
    subtitle: '연료를 채우고 새로운 바다를 준비해요',
  },
  '/shop': {
    title: '낚시 상점',
    image: 'merchant-shop',
    description: '낚싯대와 미끼가 진열된 따뜻한 상점 내부',
    subtitle: '미끼부터 나만의 낚싯대까지',
  },
  '/island-news': {
    title: '퐁당섬 소식',
    image: 'island',
    description: '잔잔한 바다와 작은 집들이 반기는 퐁당 섬',
    subtitle: '새로운 해역과 바다 친구들, 섬의 새로운 이야기',
  },
  '/harbor': {
    title: '지도',
    image: 'harbor',
    description: '새로운 바다로 향하는 섬의 항로',
    subtitle: '새로운 바다로 떠나는 곳',
  },
  '/friends': {
    title: '등대',
    image: 'lighthouse',
    description: '바다를 바라보는 언덕 위 작은 등대',
    subtitle: '친구를 만나고 인연을 이어가는 곳',
  },
  '/notifications': {
    title: '우편함',
    image: 'mailbox',
    description: '편지와 섬의 소식이 도착하는 해변 우편함',
    subtitle: '친구와 섬에서 도착한 소식과 선물',
  },
  '/square': {
    title: '광장',
    image: 'square',
    description: '게시판과 작은 집들이 둘러선 섬의 광장',
    subtitle: placeSections.square.description,
  },
  '/merchant-orders': {
    title: '바다 상인의 의뢰',
    image: 'sea-merchant',
    description: '햇살이 드는 항구에서 주문서를 붙이는 수달 상인',
    subtitle: '바다에서 모은 작은 것들, 상인이 기다려요',
  },
  '/exchange': {
    title: '거래소',
    image: 'merchant-exchange',
    description: '청록 차양과 저울이 놓인 바닷가 거래소',
    subtitle: '필요한 물건을 서로 거래해요',
  },
}

export function PlaceBanner({ pathname }: { pathname: string }) {
  const section = Object.values(placeSections).find(
    (place) => pathname === place.path || pathname.startsWith(`${place.path}/`),
  )
  const square = squareDestinations.find(
    (item) => pathname === item.path || pathname.startsWith(`${item.path}/`),
  )
  const visit = pathname.startsWith('/friends/')
  const expeditionVisit = visit && pathname.endsWith('/expeditions')
  const base =
    placeBanners[
      expeditionVisit
        ? '/expeditions'
        : visit
          ? '/friends'
          : pathname.startsWith('/arcade/')
            ? '/arcade'
            : pathname.startsWith('/exchange/')
              ? '/exchange'
              : pathname.startsWith('/board/')
                ? '/board'
                : (section?.path ?? pathname)
    ]
  const boardList = pathname === '/square/suggestions' || pathname === '/square/bugs'
  const banner = square
    ? {
        title: square.bannerTitle,
        image: square.banner,
        description: square.description,
        subtitle: boardList ? square.description : '',
      }
    : base
  const game = pathname.startsWith('/arcade/')
    ? arcadeGames.find((item) => pathname === `/arcade/${item.id}`)
    : undefined
  const compact = visit || !!square || pathname.startsWith('/arcade/')
  if (!banner) return null
  const src = `/banners/${banner.image}.png`
  return (
    <div
      role="region"
      onDragStart={(event) => event.preventDefault()}
      className={`relative ${pathname === '/aquarium' ? '' : '-mx-6'} ${pathname.startsWith('/arcade/') ? 'aspect-[15/4]' : pathname === '/expeditions' ? 'h-[clamp(72px,10dvh,80px)]' : pathname === '/my-bait-production' ? 'h-[clamp(64px,11dvh,96px)]' : boardList ? 'h-[96px]' : compact ? 'h-[clamp(68px,13dvh,104px)]' : 'h-[96px]'} shrink-0 select-none overflow-hidden bg-secondary`}
      aria-labelledby="place-banner-title"
    >
      <LandscapeImage
        key={src}
        src={src}
        alt={banner.description}
        width={1536}
        height={512}
        fetchPriority="high"
        decoding="async"
        className={`absolute inset-0 h-full w-full object-center ${compact && !square && !game ? 'object-contain' : 'object-cover'}`}
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(0deg,rgba(45,28,20,0.88)_0%,rgba(45,28,20,0.50)_45%,rgba(45,28,20,0.04)_100%)]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(45,28,20,0.30),transparent_80%)]"
        aria-hidden="true"
      />
      <div className="absolute inset-x-6 bottom-3 space-y-1 text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.55)]">
        <div className="flex items-center gap-1">
          <h1 id="place-banner-title" className="min-w-0 text-xl font-normal tracking-tight">
            {visit ? (
              <BannerBreadcrumb
                parent="등대"
                to="/friends"
                title={expeditionVisit ? '친구 통발 설치' : '친구 아쿠아리움'}
              />
            ) : square ? (
              square.bannerTitle
            ) : game ? (
              <BannerBreadcrumb
                parent={placeBanners['/arcade'].title}
                to="/arcade"
                title={game.title}
              />
            ) : (
              banner.title
            )}
          </h1>
          <BannerInfo
            key={pathname}
            title={
              visit
                ? expeditionVisit
                  ? '친구 통발 설치'
                  : '친구 아쿠아리움'
                : (game?.title ?? banner.title)
            }
            steps={bannerGuide(pathname)}
          />
        </div>
        {(!compact || boardList) && (
          <p className="text-xs leading-5 text-white">{banner.subtitle}</p>
        )}
      </div>
      {pathname === '/warehouse' && (
        <Link
          to="/shop"
          className="absolute right-4 top-3 z-10 flex min-h-11 items-center gap-1.5 rounded-full border border-white/35 bg-black/20 px-3 text-xs text-white backdrop-blur-sm hover:bg-black/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <appArt.shop className="size-7" />
          낚시 상점
        </Link>
      )}
      {pathname.startsWith('/exchange/') && <BackToListLink to="/exchange" />}
      {pathname === '/shipyard' && (
        <Link
          to="/port"
          className="absolute right-4 top-4 flex min-h-10 items-center gap-1.5 rounded-full border border-white/35 bg-black/20 px-3 text-xs text-white backdrop-blur-sm"
        >
          <appArt.port className="size-6" />
          항구로
        </Link>
      )}
      {pathname.startsWith('/board/') ? (
        <BackToListLink to="/board" />
      ) : pathname.startsWith('/arcade/') ? (
        <BackToListLink to="/arcade" />
      ) : pathname.startsWith('/square/notices/') ? (
        <BackToListLink to="/square/notices" />
      ) : pathname.startsWith('/square/suggestions/') ? (
        <BackToListLink to="/square/suggestions" />
      ) : pathname.startsWith('/square/bugs/') ? (
        <BackToListLink to="/square/bugs" />
      ) : null}
    </div>
  )
}
