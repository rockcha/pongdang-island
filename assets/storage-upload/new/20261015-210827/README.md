# 루네아의 기록 서가 스프라이트

기존 썸네일과 특급 그림체 참고를 사용한 투명 2×2 애니메이션입니다. 서가와 초승달 구조를 고정하고 책갈피 리본·진주 장식·두루마리 끝과 책 가장자리의 달빛이 잔잔하게 변합니다.

- 업로드: `npm.cmd run storage:upload -- assets/storage-upload/new/20261015-210827`
- 적용: [SQL 55](../../../../../supabase/sql/55-lunea-archive-animation/01-lunea-archive-animation.sql)를 54 다음에 실행합니다.
- 썸네일·크기·등급·안개달 서식지·보유·배치 좌표를 유지합니다.
- 참고·프롬프트는 `manifest.json`, 여백은 `alpha-report.json`, 기준점은 `frame-registration.json`, 업로드 검증은 `upload-report.json`에 기록합니다.
- `preview.html`에서 제자리 재생을 확인할 수 있습니다. 원격 SQL 실행은 별도입니다.

완료: 스프라이트 1장 Storage 업로드, 공개 응답 HTTP 200과 로컬 해시 일치 확인. 네 프레임 경계 검사와 관련 테스트 41개, 프로덕션 빌드 통과.
