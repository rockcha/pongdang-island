# 개발 문서 목차

작업 규칙은 [루트 AGENTS.md](../AGENTS.md), 실행 방법은 [README](../README.md)에 있습니다. 아래에서 관련 문서만 읽고, 코드 위치가 필요하면 [시스템 지도](system-map.md)를 확인합니다.

## 현재 기능

| 작업 주제 | 읽을 문서 |
| --- | --- |
| 로그인·가입·세션·비밀번호 복구 | [인증과 계정](systems/auth.md) |
| 메뉴·페이지 구조 | [내비게이션](systems/navigation.md) |
| 프로필·아바타 | [아바타](systems/avatar.md) |
| 친구·실시간 알림 | [친구·알림](systems/realtime-social.md) |
| 선물·우편함 | [선물](systems/gifts.md) |
| 골드·상점 | [골드·상점](systems/gold-shop.md) |
| 지역·지역 이동 | [지역](systems/regions.md) · [지역 이동](systems/region-travel.md) |
| 낚시·미끼·연출 | [낚시](systems/fishing.md) · [미끼](systems/bait-catalog.md) · [연출](systems/fishing-presentation.md) |
| 개체·도감 | [개체](systems/collectibles.md) |
| 수족관·어항 관리 | [수족관](systems/aquarium.md) · [어항 관리](systems/aquarium-tanks.md) |

## 디자인·이미지·DB

- UI 작업은 [공통 UI 규칙](ui-conventions.md)을 읽고 해당 항목의 상세 문서로 이동합니다.
- 상세 디자인: [색상](design/colors.md), [장소 메뉴](design/place-navigation.md), [장소 배너](design/place-banners.md), [확인 모달](design/confirmation-dialog.md).
- 이미지 생성·교체·업로드는 [에셋 안내](../assets/README.md)의 순서를 따릅니다.
- DB 설치·변경은 [SQL 적용 순서](../supabase/sql/README.md)에서 관련 번호를 확인합니다.

## 과거 기록

생성 당시 프롬프트·업로드 내역은 [생성 기록 목차](../assets/storage-upload/history.md)에서 필요한 배치만 찾습니다. 현재 생성 규칙은 [등급별 기준](../assets/references/collectible-style/README.md)과 [방향 규칙](../assets/references/collectible-style/artwork-facing.md)이 기준입니다. 문서에 과거 시점의 어종 수나 적용 상태가 나오면 해당 버전의 기록으로 읽고 실제 상태는 코드·대상 DB에서 확인합니다.
