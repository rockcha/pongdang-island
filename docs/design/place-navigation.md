# 장소와 하위 메뉴

사용자 표시 이름은 **퐁당 섬**, **우편함**, **광장**, **상인거리**로 사용합니다. 퐁당 섬의 사이드바 아이콘은 야자수·작은 섬·물결을 그린 `IslandIcon`입니다. 앱 로고와 퐁이 마스코트 이미지는 유지합니다.

사이드바의 광장·상인거리는 각각 이동 가능한 부모 링크입니다. 하위 메뉴는 기본적으로 펼쳐진 목록으로 표시하며 들여쓰기·옅은 세로선·작은 아이콘으로 계층을 구분합니다. 하위 페이지에서는 부모를 해당 구역으로 강조하고 실제 선택한 하위 링크에만 `aria-current=page`를 설정합니다. 좁은 모바일 화면에서는 사이드바 자체가 세로로 스크롤됩니다.

| 부모 | 하위 메뉴 | 경로 | 공통 배너 |
| --- | --- | --- | --- |
| 광장 `/square` | 공지사항 | `/square/notices` | `/banners/square-notices.png` |
| 광장 | 건의함 | `/square/suggestions` | `/banners/square-suggestions.png` |
| 광장 | 버그 제보 | `/square/bugs` | `/banners/square-bugs.png` |
| 상인거리 `/merchant-street` | 상점 | `/shop` | `/banners/merchant-shop.png` |
| 상인거리 | 거래소 | `/merchant-street/exchange` | `/banners/merchant-exchange.png` |
| 상인거리 | 경매소 | `/merchant-street/auctions` | `/banners/merchant-auction.png` |

광장은 “섬의 소식을 나누고, 더 좋은 내일을 만드는 곳”, 상인거리는 “소중한 물건이 새로운 주인을 만나는 곳”으로 소개합니다. 광장·상인거리 하위 페이지는 각각 전용 배너 위에 `광장 › 공지`, `광장 › 건의함`, `광장 › 버그 제보`, `상인거리 › 장소 이름`을 표시하며 부모 링크로 목록에 돌아옵니다. 공지 목록·상세·작성·수정은 모두 `광장 › 공지`를 유지합니다. 미니게임과 `BannerBreadcrumb` 컴포넌트·제목 크기·80~128px 배너 높이·object-contain 방식을 공유하고 부제와 본문의 중복 제목은 생략합니다.

구역 정보는 `src/lib/place-sections.ts`에서 관리하며 사이드바·구역 페이지·배너가 공유합니다. 부모 페이지에는 하위 페이지로 이동하는 카드 목록이 있고 하위 페이지에는 구역으로 돌아가는 링크가 있습니다.

광장 입구는 공지사항·건의함·버그 제보의 썸네일 카드입니다. 상인거리와 `PlaceDestinations` 컴포넌트를 공유하며 왼쪽 36% 이미지·오른쪽 이름과 설명으로 배치합니다. 이미지 매핑은 `src/lib/square-destinations.ts`, 최종 PNG는 `public/square/`와 `public/banners/`, 생성 프롬프트는 [광장 이미지 manifest](../../assets/references/square-destinations-manifest.json)에 보관합니다. 건의함·버그 제보 기능은 준비 중 표시를 유지합니다. SQL·Storage 업로드는 필요하지 않습니다.

상인거리 입구는 세 장소의 썸네일 카드 목록입니다. 이미지가 카드 왼쪽 36%와 세로 전체를 채우고 오른쪽에 장소 이름·설명을 표시합니다. 경매소 카드는 경매 목록으로 이동합니다. 이미지 매핑은 `src/lib/merchant-destinations.ts`, PNG 6종은 `public/merchants/`와 `public/banners/`, built-in image_gen 최종 프롬프트는 [생성 manifest](../../assets/references/merchant-destinations-manifest.json)에 보관합니다. 이 이미지들은 SQL·Storage 업로드가 필요하지 않습니다.

거래소는 [물품 보관·교환과 우편 배송](../systems/exchange.md), 경매소는 [입찰금 보관·선물함 반환·마감 정산](../systems/auctions.md), 공지사항은 [운영자 작성·이미지·게시 관리](../systems/notices.md)를 구현했습니다. 건의·버그 제보 등록은 준비 화면입니다. 우편함은 기존 `/notifications` 경로와 알림·선물 기능을 사용합니다.

## 배너 생성

내장 `image_gen`으로 두 풍경을 새로 생성해 `public/banners/square.png`, `public/banners/merchant-street.png`에 복사했습니다. 기존 배너와 같은 해변 마을·산호빛 지붕·푸른 바다 분위기입니다. [전체 배너 및 프롬프트](place-banners.md).

## 접기와 도감

광장·상인거리는 화살표 버튼으로 접고 펼치며 로컬 스토리지 `pongdang:island-navigation:expanded`에 상태를 저장합니다. 부모 링크는 구역으로 이동합니다.

등대·상점으로 명칭을 통일합니다. 상점은 상인거리의 첫 하위 메뉴이며 기존 /shop 기능을 사용하고 배너는 표시하지 않습니다.

바다 도감은 사이드바에서 제거하고 아쿠아리움 상단의 개체 목록·배경·보관함·도감 아이콘 묶음에 배치합니다. CollectionDialog는 열 때 조회하며 종류 필터와 상세 모달을 제공합니다. 기존 /collection 주소는 아쿠아리움으로 이동합니다.
