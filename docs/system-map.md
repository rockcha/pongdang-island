# 시스템 지도

공지사항은 `src/features/notices/`와 [공지 시스템 문서](systems/notices.md)를 참조합니다. 검증은 `tests/notices-sql.test.ts`, `tests/notices-ui.test.tsx`입니다.

경매소는 `src/features/auctions/`와 [경매 시스템 문서](systems/auctions.md)를 참조합니다. DB 검증은 `tests/auction-sql.test.ts`입니다.

[문서 목차](README.md)에서 작업 주제를 고른 뒤 코드 위치가 필요할 때 사용합니다. 기능의 상세 규칙은 각 시스템 문서가 기준입니다.

| 기능 | 코드 진입점 | 설명 |
| --- | --- | --- |
| 앱·라우팅 | `src/main.tsx`, `src/App.tsx`, `src/routes.tsx`, `src/layouts/app-layout.tsx` | [메뉴](systems/navigation.md) |
| 인증·계정 | `src/components/auth-provider.tsx`, `src/lib/auth-storage.ts`, `src/pages/login-page.tsx` | [인증](systems/auth.md) |
| Supabase 연결·타입 | `src/lib/client.ts`, `src/lib/database.types.ts` | [SQL 안내](../supabase/sql/README.md) |
| 프로필·아바타 | `src/features/profile/` | [아바타](systems/avatar.md) |
| 친구·실시간 알림 | `src/features/friends/`, `src/features/notifications/`, `src/features/social/` | [친구·알림](systems/realtime-social.md) |
| 선물·우편함 | `src/features/gifts/` | [선물](systems/gifts.md) |
| 골드·상점 | `src/features/gold/` | [골드](systems/gold-shop.md) |
| 거래소·보관·교환 | `src/features/exchange/`, `src/features/gifts/` | [거래소](systems/exchange.md) |
| 지역·출항 | `src/features/regions/` | [지역](systems/regions.md) · [이동](systems/region-travel.md) |
| 미끼·낚시 | `src/features/fishing/` | [낚시](systems/fishing.md) · [미끼](systems/bait-catalog.md) · [연출](systems/fishing-presentation.md) |
| 개체·도감 | `src/features/collection/` | [개체](systems/collectibles.md) |
| 수족관·이동·편집 | `src/features/aquarium/` | [수족관](systems/aquarium.md) · [어항 관리](systems/aquarium-tanks.md) |
| 이미지 방향 | `src/features/aquarium/movement-settings.ts`, `artwork-facing.json` | [방향 규칙·예외](../assets/references/collectible-style/artwork-facing.md) |
| 공통 UI·테마 | `src/components/ui/`, `src/index.css` | [UI 규칙](ui-conventions.md) |
| PWA | `vite.config.ts`, `src/components/pwa-status.tsx` | [실행·빌드](../README.md) |
| 브랜드·고정 이미지 | `public/`, `src/components/brand-mascot.tsx` | [에셋 안내](../assets/README.md) |

API 변경은 호출 코드 → 관련 SQL/RPC → 타입 → 관련 테스트 순서로 확인합니다. UI 변경은 컴포넌트와 공통 UI 규칙을 함께 확인합니다. 실제 DB·Storage 적용 여부는 이 지도에서 관리하지 않습니다.

## 기능별 SQL과 테스트

위 코드 진입점에서 범위를 정한 뒤 해당 행의 SQL·테스트만 확인합니다. 번호는 탐색 시작점이며 후속 SQL에서 같은 RPC를 재정의할 수 있습니다. [SQL 안내](../supabase/sql/README.md)에서 관련 정의를 검색합니다. UI 표시만 수정하면 SQL을 읽을 필요는 없습니다.

| 기능 | SQL 진입점 번호 | 테스트 진입점 (`tests/` 기준) |
| --- | --- | --- |
| 인증·계정 | 앱 인증은 Auth 사용, 프로필은 01 | `auth-storage.test.ts`, `auth-email.test.ts`, `signup.test.tsx`, `reset-password.test.tsx` |
| 아바타 | 06 | `avatar.test.ts` |
| 친구·알림 | 01~05, 07 | `social-realtime.test.tsx`, `notifications-page.test.tsx`, `social-sql.test.ts` |
| 선물 | 23, 26 | `gifts.test.tsx`, `social-sql.test.ts` |
| 골드·상점 | 08, 구매 기능의 후속 SQL | `gold-wallet.test.ts`, `social-sql.test.ts` |
| 지역·출항 | 11, 12, 30, 32 | `region-map.test.tsx`, `sailing.test.tsx`, `regional-fishing-sql.test.ts` |
| 미끼·낚시 | 13~16, 32, 61, 62 | `prepared-fishing-sql.test.ts`, `fishing-panel.test.tsx`, `tension-game.test.ts`, `tension-fishing-game.test.tsx` |
| 개체·도감·토착 | 15~17, 30, 32, 34, 해당 종 변경 | `collection.test.tsx`, `native-collectibles-sql.test.ts`, `native-region-badge.test.tsx` |
| 보관함·배정·판매 | 22, 26 | `collectible-storage-dialog.test.tsx`, `aquarium-inventory-dialog.test.tsx`, `social-sql.test.ts` |
| 배경·어항 전환 | 09, 10, 26 | `aquarium-background-dialog.test.tsx`, `aquarium-decoration.test.tsx`, `tank-swipe.test.ts`, `social-sql.test.ts` |
| 변환 편집·임시 개체 | 25, 46, 47 | `decoration-editor.test.tsx`, `aquarium-decoration.test.tsx`, `aquarium-temporary.test.tsx`, `collectible-transforms-sql.test.ts` |
| 이동·시트·방향 | 35, 39, 49, 해당 종 변경 | `inhabitant-motion.test.ts`, `swim-motion.test.ts`, `swim-frame-layout.test.ts`, `artwork-facing.test.ts` |
| 메뉴·공통 UI | 보통 없음 | `island-navigation.test.tsx`, `place-banner.test.tsx`, `confirm-dialog.test.tsx` |

저장소 루트에서 관련 파일을 지정해 실행합니다. Windows PowerShell에서는 `npm.cmd`를 사용할 수 있습니다.

```sh
npm test -- tests/collection.test.tsx tests/aquarium-temporary.test.tsx
npm test -- tests/prepared-fishing-sql.test.ts
```

SQL 테스트가 설치용 SQL을 자동으로 읽고 실행하는 것과 에이전트가 SQL 전체를 컨텍스트로 읽는 것은 별개입니다. 테스트 준비 코드는 해당 검증의 의존 목록이며 전체 원격 설치 목록을 뜻하지 않습니다. 기능 간 계약을 바꾸면 관련 테스트 범위를 넓히고 빌드 검증은 루트 README를 따릅니다.
