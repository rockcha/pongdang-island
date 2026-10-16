# 장식품 5종 제자리 스프라이트

과거 생성 배치 기록입니다. 현재 생성·저장 규칙은 [에셋 안내](../../../README.md)를 따르며 원격 반영 여부는 별도 확인합니다.

난파선·첫 산호의 요람·꿈을 담는 우물·산호빛 작은 집·달빛 해파리 풍등의 기존 디자인을 참고해 투명 2×2 스프라이트를 추가합니다. 일반·희귀 그림체 기준을 따릅니다. 본체는 고정하고 물살에 반응하는 부분과 내부 빛을 움직입니다.

기존 썸네일·크기·배치·보유 내역은 유지합니다. SQL 54는 별도로 버터 불가사리와 물결 산호 조각을 일반 등급으로 바꾸며 판매 가격과 기존 이미지 경로는 유지합니다.

업로드: `npm.cmd run storage:upload -- assets/storage-upload/new/20261015-205549`

DB 적용: [SQL 54](../../../../supabase/sql/54-living-decorations/01-living-decorations.sql)를 53 다음에 실행합니다. 원격 SQL은 별도입니다.

`manifest.json`에 참고·프롬프트, `alpha-report.json`에 여백 검사, `frame-registration.json`에 기준점 보정, `upload-report.json`에 공개 Storage 검증을 기록합니다. `preview.html`에서 제자리 애니메이션을 확인할 수 있습니다.

완료: PNG 5장 Storage 업로드, 공개 응답 HTTP 200 및 로컬 해시 일치. 20개 프레임 경계 검사 통과. 관련 테스트 39개와 빌드 통과. 원격 SQL은 실행하지 않았습니다.
