# 퐁당섬 시스템 지도

개체 그림체는 [저장된 등급별 참고 이미지](../assets/references/collectible-style/README.md)를 사용합니다. 일반·희귀는 퐁이 카툰풍, 특급·신화는 별빛 가오리 참고의 부드러운 판타지 일러스트풍입니다.

개체 이미지 생성 작업은 [이미지 생성·업로드 규칙](../assets/storage-upload/README.md)을 따릅니다. 앞으로는 `assets/storage-upload/new/YYYYMMDD-HHmmss/` 아래에 버킷 내부의 종류·등급 폴더를 그대로 구성합니다(한국 시간).

DB 관리 정비: 2026-10-16. DB 작업은 [DB 관리](systems/database-management.md)와 [생성 컨텍스트](db/CONTEXT.md)를 먼저 확인합니다. 아래 기능별 SQL 번호와 적용 언급은 과거 구현 기록이며 원격 현재 상태의 근거가 아닙니다.

React + Vite + TypeScript 모바일 PWA입니다. 기본 글꼴은 고운돋움이며 이메일/비밀번호 인증을 사용합니다.

## 기능별 진입점

| 시스템 | 위치 | 역할 |
| --- | --- | --- |
| 앱 부팅 | `src/main.tsx` | BrowserRouter, AuthProvider |
| 앱 전역 | `src/App.tsx` | SocialProvider, Toaster, PWA 상태 |
| 라우팅 | `src/routes.tsx` | 공개/로그인/닉네임 완료 경로 구분 |
| 공통 UI | `src/layouts/app-layout.tsx` | 로고, 로그아웃, 친구/알림 링크, 안 읽은 배지 |
| 인증 세션 | `src/components/auth-provider.tsx` | 세션 복원, 이벤트, 비밀번호 복구 상태 |
| 접근 흐름 | `src/components/auth-guard.tsx` | 로그인/닉네임/복구 경로 안내. 데이터 권한은 DB RLS가 담당 |
| 가입/로그인 | `src/pages/login-page.tsx` | 이메일 가입, 기억하기, 즉시 닉네임 설정 |
| 닉네임 | `src/pages/nickname-page.tsx` | Auth 메타데이터의 `game_nickname` 저장 |
| 이메일 검사 | `src/lib/email-validation.ts` | 형식 및 도메인 MX/A/AAAA 보조 검사 |
| 비밀번호 복구 | `src/pages/forgot-password-page.tsx`, `email-confirm-page.tsx`, `reset-password-page.tsx` | 메일 요청 → 링크 검증 → 비밀번호 변경 |
| Supabase 연결 | `src/lib/client.ts` | 타입이 연결된 싱글턴 클라이언트, PKCE |
| DB 타입 | `src/lib/database.types.ts` | 앱용 수기 계약 (일부 테이블/RPC만 표현) |
| 세션 저장소 | `src/lib/auth-storage.ts` | local/sessionStorage 선택. 비밀번호 저장 없음 |
| 아바타 / 프로필 | `src/features/profile/` | 사진 업로드·WebP 변환·미리보기·저장·기본값 복원 |
| 친구 API/UI | `src/features/friends/` | 코드 검색, 만남의 등대: 요청/수락/거절/취소, 친구 끊기 |
| 알림 API/UI | `src/features/notifications/` | 전체/친구/소식, 읽음, 정확한 전체 안 읽은 개수 |
| 실시간 상태 | `src/features/social/social-provider.tsx` | 프로필 동기화, 구독, 토스트, 재연결/포커스 시 재조회 |
| 도메인 타입/오류 | `src/features/social/types.ts` | 친구·알림 모델과 사용자 오류 문구 |
| DB 정의 | `supabase/migrations/`, `docs/db/` | 버전 변경 이력과 자동 생성 최종 구조 |
| 일반 알림 발송 예 | `supabase/sql/examples/send-general-notification.sql` | 관리자/서버만 실행 |
| UI 컴포넌트 | `src/components/ui/` | shadcn 및 Sonner |
| 전역 디자인 | `src/index.css` | 테마, 고운돋움, 모바일 safe area |
| PWA | `vite.config.ts`, `src/components/pwa-status.tsx` | 설치, 오프라인 자산, 업데이트 안내 |
| 브랜드 자산 | `public/` | 생성된 로고·섬 아이콘·파비콘 |

## 친구 / 알림 데이터 흐름

1. 로그인하고 닉네임이 있으면 SocialProvider가 `sync_player_profile` RPC 호출.
2. 서버가 본인의 Auth 닉네임을 검증해 `player_profiles`에 동기화하고 고유 친구 코드 생성.
3. 친구 코드 정확히 검색 → `send_friend_request` RPC → 요청과 수신자 친구 알림을 한 트랜잭션으로 저장.
4. 수신자가 수락/거절하거나 발신자가 취소 → `respond_friend_request` RPC.
5. 수락은 `status=accepted`로 저장. 이 요청 행이 친구 관계이며 별도 friendships 테이블은 없음. 수락 알림은 발신자에게 생성.
6. Realtime INSERT/UPDATE 이벤트 → 짧게 모아서 재조회 → 화면/배지 동기화. 신규 알림 INSERT만 토스트.
7. 일반 알림은 신뢰된 관리자/서버가 `notifications`에 `category=general`로 저장하면 동일한 구독으로 전달.

친구 요청의 `status`와 알림의 `read_at`은 별개입니다. 읽음으로 표시해도 요청은 사라지지 않습니다. 요청이 처리되면 기존 요청 알림은 읽음 처리되고 처리 결과를 표시합니다.

## 무엇을 바꿀 때 어디부터 읽나

- 친구 동작 추가: `friends/api.ts` → 생성 DB 컨텍스트의 최종 함수 → 새 migration → `types.ts` / `database.types.ts` → SQL 테스트.
- 새 일반 알림 종류: 알림 테이블 CHECK → 도메인/DB 타입 → 신뢰된 서버 발송 코드. 브라우저 INSERT 권한을 주지 않음.
- 알림 도착/개수 문제: SocialProvider → notifications/api.ts → 수신자 RLS와 Publication → 실제 DB에서 두 계정 테스트.
- 닉네임 변경: nickname-page → AuthProvider → SocialProvider의 닉네임 의존성 → sync RPC. 게임 닉네임은 권한 기준이 아님.
- 로그인 문제: auth-provider / auth-storage / login-page. 친구 시스템 실패가 인증 자체를 막지 않도록 독립적으로 유지.
- SQL 적용: [설치 가이드](systems/realtime-social.md), [SQL 순서](../supabase/sql/README.md).

## 검증과 현재 적용 범위

`npm test`는 인증/도메인 검사 외에 실제 로컬 PostgreSQL(PGlite) RLS·함수 테스트와 Realtime 구독 수명주기 모의 테스트를 실행합니다. `npm run build`는 TypeScript와 Vite/PWA 빌드입니다.

친구·알림 SQL과 프론트엔드 코드는 준비됐지만 원격 Supabase에 SQL은 자동 적용하지 않았습니다. 로컬 SQL 검증은 통과했습니다. 실제 Realtime 전달은 원격 SQL 실행 후 서로 다른 두 브라우저/계정으로 확인해야 합니다. 이 앱의 Realtime은 앱 실행 중 연결이며 OS 푸시 알림은 포함하지 않습니다.

향후 DB를 바꿀 때 새 migration, 앱 타입, 관련 테스트를 함께 수정하고 `db:context`로 파생 문서를 갱신합니다. 01~38 SQL은 동결되었으며 후속 변경은 `supabase/migrations/`로 관리합니다.

아바타 기능: [상세 구조와 설치](systems/avatar.md). 프로필 사진은 player_profiles.avatar_path와 avatars Storage 버킷을 사용합니다. 기존 DB는 06 SQL을 추가 실행합니다. 헤더 오른쪽에서 내 프로필로 이동하며 로그아웃은 프로필 화면에 있습니다.

## 브랜드 기준

현재 메인 로고/마스코트는 해달 **퐁이**입니다. 원본은 `public/branding/pongi.png`, 공통 표시 컴포넌트는 `src/components/brand-mascot.tsx`입니다. 헤더, 로그인, 홈, 닉네임 설정, 404 화면에 사용합니다. 파비콘/PWA 아이콘은 같은 원본으로 `scripts/generate-icons.ps1`에서 생성합니다. 이전 섬 로고 자산은 보관하지만 화면에서는 사용하지 않습니다.

## 섬 메뉴 / 페이지 구성

[메뉴 시스템 문서](systems/navigation.md). 헤더 햄버거 버튼은 `src/components/island-navigation.tsx`의 왼쪽 Sheet를 엽니다. 퐁당마을(`/`), 아쿠아리움(`/aquarium`), 선착장(`/harbor`), 우체통(`/notifications`), 마이페이지(`/profile`)로 이동하며 만남의 등대(`/friends`)에서 친구를 관리합니다. 아쿠아리움·선착장은 게임 기능을 준비 중인 기본 화면입니다.

친구 끊기: src/features/friends/remove-friend-button.tsx → friends/api.ts → public.remove_friend. 추가 SQL은 supabase/sql/07-friend-removal/01-remove-friend.sql이며 기존 01~06 적용 DB에 추가 실행합니다. 친구 화면과 메뉴 명칭은 만남의 등대입니다.

골드/상점: [시스템 문서](systems/gold-shop.md). /shop, src/features/gold/, public/currency/gold-coin.png. Supabase DB 지갑·거래 내역과 중앙 증감 효과. 08-gold/01-wallet.sql 추가 적용.

아쿠아리움 배경: [시스템 문서](systems/aquarium.md). src/pages/aquarium-page.tsx와 features/aquarium/api.ts. 09-aquarium SQL, assets/storage-upload/aquarium-backgrounds의 생성 이미지 4개를 Storage에 수동 업로드.

다중 어항: [관리 시스템](systems/aquarium-tanks.md). 10-aquarium-tanks/01-tanks.sql, aquarium_tanks, buy_aquarium_tank/manage_aquarium_tank RPC. 추가 어항 200골드, 이름·배경 개별 저장.

모바일 세로 배경 원본: assets/storage-upload/aquarium-backgrounds-portrait/ (기본/산호/달빛/진주). Storage 업로드 안내는 해당 README.md. 기존 가로 원본은 aquarium-backgrounds/에 보관.

지역/등급: [시스템 문서](systems/regions.md). src/pages/harbor-page.tsx 지도 모달, features/regions/api.ts. src/lib/game/rarity.ts와 RarityBadge 공통 등급. 11-regions SQL, assets/storage-upload/regions/ 이미지 5개 → regions Storage 버킷. 지도 조각 획득 규칙은 추후.

출항/도착: [지역 이동 문서](systems/region-travel.md). 12-region-travel SQL. /sailing/:regionId → 5초 퐁이 뗏목 → /region/:regionId. 본인 계정 잠금 테스트 버튼과 운영 종료 스위치. public/sprites/pongi-sailing.png.

출항 랜덤 장면: src/features/regions/sailing-scenes.ts에서 뗏목/망원경 돛단배/지도 조개 배 3종 선택. public/sprites/의 2x2 시트와 장면별 문구 사용. SQL 변경 없음.

미끼/인벤/낚시: [시스템 문서](systems/fishing.md). 13-fishing SQL, src/features/fishing/. 선착장 미끼 구매/보유 모달과 지역 낚시. public/items/baits/ 아이콘 3종. 일반30/특수300/안전100골드, 서버 추첨/1개 소모/등급 결과/기록.

미끼 도감 최신 정책: [설명/구조](systems/bait-catalog.md), 14-bait-catalog/01-baits.sql. 퐁당 지렁이만 구매 가능, 달빛 진주새우/이슬잎 경단/심해 인력석/별잠의 유혹은 가격 없는 획득 전용. 자석은 장식물 시스템 전까지 사용 차단.

낚시 모달: [연출 문서](systems/fishing-presentation.md). features/fishing/fishing-dialog.tsx, fishing-presentation.ts. 3초/스프라이트3종/TMI6종/실패문구8종. public/sprites/pongi-fishing-*.png. SQL 변경 없음.


## 실제 개체·도감 (15)
[시스템 문서](systems/collectibles.md). collection → 종·보유·도감, aquarium/tank-inhabitants → 유영/회전/고정, fishing → 실제 개체 획득. /collection 경로. SQL15는 기존 낚시 기록과 등급별 수량을 초기화합니다. 지도는 미해금 지역을 열며 어항에 들어가지 않습니다.



카툰 개체: 15 다음 16-cartoon-collectibles/01-cartoon-collectibles.sql 추가 실행. 총 7종(등급별 물고기 4 + 일반 지도/장식물/쓰레기). 물고기 sprite_sheet_path는 2×2 시트 한 장. collectibles 버킷의 fish/normal·rare·epic·mythic, map, decorations, trash에 PNG 11개 업로드. 자세한 구조는 collectibles.md 참고.

폴더 재배치: 16 적용 후 17-collectible-paths/01-paths.sql 실행. 종이름_sprite.png 및 종이름_thumbnail.png 형식, v2 제거. 기존 데이터 보존.

공통 등급 폴더: fish/trash/map/decorations 모두 normal·rare·epic·mythic으로 구분합니다. 기존 일반 쓰레기·지도·장식물 이미지는 각각 normal로 이동했습니다. 수정된 17 SQL을 재실행하면 DB 경로가 갱신됩니다.
