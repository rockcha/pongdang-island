# 개발 문서

새 작업을 시작할 때 [시스템 지도](SYSTEM_MAP.md)를 먼저 읽습니다.

DB 작업은 [DB 관리와 원격 확인](systems/database-management.md) → [자동 생성 DB 컨텍스트](db/CONTEXT.md)를 먼저 읽습니다. 기능 문서의 과거 SQL 실행 안내는 설치 기준이 아닙니다.

개체 이미지 생성 전에는 [등급별 그림체와 실제 참고 이미지](../assets/references/collectible-style/README.md)를 확인합니다. 일반·희귀는 퐁이 카툰풍, 특급·신화는 별빛 가오리 일러스트풍입니다.

- [시스템 지도와 코드 진입점](SYSTEM_MAP.md): 기능 위치, 데이터 흐름, 작업별 읽을 파일
- [개체 선물·우편함](systems/gifts.md): 개체 선물, 메모, 수령, 이모지 답장·실시간 알림과 23 SQL
- [친구 / 실시간 알림](systems/realtime-social.md): SQL 설치, 권한, Realtime, 두 계정 검증
- [프로젝트 실행 및 인증 설정](../README.md)
- [SQL 실행 순서](../supabase/sql/README.md)
- [새 이미지 생성·업로드 폴더 규칙](../assets/storage-upload/README.md): new/한국 생성시간/ 아래에 collectibles 내부 계층으로 저장

이 문서들은 코드의 현재 구조를 설명합니다. 변경 시 관련 문서와 SQL/DB 타입/테스트를 함께 갱신합니다.
- [아바타와 프로필](systems/avatar.md): 이미지 업로드·Storage 정책·아바타 표시
- [낚싯대 인벤토리·창고](systems/rod-inventory.md): 실제 골드 구매·반값 판매, DB 장착과 낚싯대/미끼 창고
- [연속 출석](systems/attendance.md): 한국 시간 기준 30일 출석지·매일 골드·7일/30일 미끼 보상
- [오락실](systems/arcade.md): 게임 목록·상세 페이지, 게임 등록과 참가 조건 확장
- [섬 메뉴와 페이지](systems/navigation.md): 왼쪽 drawer, 퐁당마을·아쿠아리움·선착장·우체통·마이페이지
# 공통 UI 규칙

[툴팁 색상·개체 카테고리 고정 아이콘](UI_CONVENTIONS.md)을 따릅니다.
