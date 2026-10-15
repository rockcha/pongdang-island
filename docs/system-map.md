# 시스템 지도

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
| 지역·출항 | `src/features/regions/` | [지역](systems/regions.md) · [이동](systems/region-travel.md) |
| 미끼·낚시 | `src/features/fishing/` | [낚시](systems/fishing.md) · [미끼](systems/bait-catalog.md) · [연출](systems/fishing-presentation.md) |
| 개체·도감 | `src/features/collection/` | [개체](systems/collectibles.md) |
| 수족관·이동·편집 | `src/features/aquarium/` | [수족관](systems/aquarium.md) · [어항 관리](systems/aquarium-tanks.md) |
| 이미지 방향 | `src/features/aquarium/movement-settings.ts`, `artwork-facing.json` | [방향 규칙·예외](../assets/references/collectible-style/artwork-facing.md) |
| 공통 UI·테마 | `src/components/ui/`, `src/index.css` | [UI 규칙](ui-conventions.md) |
| PWA | `vite.config.ts`, `src/components/pwa-status.tsx` | [실행·빌드](../README.md) |
| 브랜드·고정 이미지 | `public/`, `src/components/brand-mascot.tsx` | [에셋 안내](../assets/README.md) |

API 변경은 호출 코드 → 관련 SQL/RPC → 타입 → 관련 테스트 순서로 확인합니다. UI 변경은 컴포넌트와 공통 UI 규칙을 함께 확인합니다. 실제 DB·Storage 적용 여부는 이 지도에서 관리하지 않습니다.
