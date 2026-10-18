# 개발 문서

목차 정리: 2026-10-18. 전체 기능 검증이나 원격 DB 적용 완료를 의미하지 않습니다.

작업 주제를 고른 뒤 [시스템 지도](system-map.md)에서 코드와 테스트 위치를 확인합니다. 실행·환경변수·빌드는 [프로젝트 안내](../README.md)를 확인합니다.

DB 작업은 [DB 관리](systems/database-management.md) → [로컬 컨텍스트](db/CONTEXT.md) → 필요한 최종 정의 순서로 읽습니다. 로컬 생성 문서는 migrations의 기대 상태이며, [원격 조회 요약](db/REMOTE_REVIEW.md)은 2026-10-18 부분 조회와 과거 캡처의 범위를 구분합니다. `artifacts/*-install.sql`의 존재는 원격 적용 완료의 증거가 아닙니다. 기능 문서의 과거 SQL 실행 안내보다 DB 관리 문서를 우선합니다.

## 문서 유지 기준

의도·결정 이유·작업 절차·검증 방법·운영 주의사항을 남깁니다. 코드나 도구로 확인 가능한 목록·값·적용 상태는 수기로 중복 관리하지 않습니다. 변경할 때마다 새 문서나 완료 보고서를 만들지 않습니다. migrations·테스트·카탈로그 원본·이미지 manifest와 필수 자동 생성 산출물은 유지합니다. 구체적인 작업 규칙은 [AGENTS.md](../AGENTS.md)를 따릅니다.

## 공통 기준

- [시스템 지도](system-map.md)
- [공통 UI 규칙](ui-conventions.md)

## 기능별 문서

- [여러 어항 관리](systems/aquarium-tanks.md)
- [수족관·배경·렌더링](systems/aquarium.md)
- [섬 오락실](systems/arcade.md)
- [연속 출석과 28일 출석지](systems/attendance.md)
- [경매소](systems/auctions.md)
- [인증과 계정](systems/auth.md)
- [아바타 / 내 프로필](systems/avatar.md)
- [미끼 도감과 획득 구분](systems/bait-catalog.md)
- [개체·도감](systems/collectibles.md)
- [DB 관리와 컨텍스트](systems/database-management.md)
- [거래소와 물품 보관](systems/exchange.md)
- [낚시 모달과 랜덤 연출](systems/fishing-presentation.md)
- [미끼·인벤토리·기본 낚시](systems/fishing.md)
- [친구 아쿠아리움 방문과 먹이 주기](systems/friend-aquarium-visits.md)
- [개체 선물·우편함](systems/gifts.md)
- [골드와 상점 — DB 연동](systems/gold-shop.md)
- [지도 상점](systems/map-shop.md)
- [카드 짝맞추기](systems/memory-game.md)
- [헤더 빠른 내비게이션](systems/navigation.md)
- [공지사항](systems/notices.md)
- [친구와 실시간 알림](systems/realtime-social.md)
- [지역 잠금 테스트와 출항/도착](systems/region-travel.md)
- [지역 지도와 공통 등급](systems/regions.md)
- [낚싯대 인벤토리와 창고](systems/rod-inventory.md)
- [그림자 맞추기](systems/shadow-game.md)

## 에셋·설계·이력

- [해역 콘셉트와 변경 조건](design/region-concepts.md)

- [에셋 안내](../assets/README.md)
- [개체 그림체와 참고 이미지](../assets/references/collectible-style/README.md)
- [이미지 생성·업로드 규칙](../assets/storage-upload/README.md)
- [낚시 미니게임 설계](design/fishing-minigame.md)
- [홀짝 게임 설계](design/odd-even-game.md)
- [구현 기록 목차](history/README.md)
