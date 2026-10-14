# 개발 문서

새 작업을 시작할 때 [시스템 지도](SYSTEM_MAP.md)를 먼저 읽습니다.

- [시스템 지도와 코드 진입점](SYSTEM_MAP.md): 기능 위치, 데이터 흐름, 작업별 읽을 파일
- [개체 선물·파도 우편함](systems/gifts.md): 개체 선물, 메모, 수령, 이모지 답장·실시간 알림과 23 SQL
- [친구 / 실시간 알림](systems/realtime-social.md): SQL 설치, 권한, Realtime, 두 계정 검증
- [프로젝트 실행 및 인증 설정](../README.md)
- [SQL 실행 순서](../supabase/sql/README.md)

이 문서들은 코드의 현재 구조를 설명합니다. 변경 시 관련 문서와 SQL/DB 타입/테스트를 함께 갱신합니다.
- [아바타와 프로필](systems/avatar.md): 이미지 업로드·Storage 정책·아바타 표시
- [섬 메뉴와 페이지](systems/navigation.md): 왼쪽 drawer, 퐁당마을·아쿠아리움·선착장·우체통·마이페이지
# 공통 UI 규칙

[툴팁 색상·개체 카테고리 고정 아이콘](UI_CONVENTIONS.md)을 따릅니다.
