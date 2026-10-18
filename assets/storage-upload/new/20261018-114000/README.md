# 공통 개체 12종

희귀 5종·특급 4종·신화 3종. 썸네일 12개와 2×2 시트 12개는 내장 image_gen으로 생성했습니다. 등급별 참고 파일과 최종 프롬프트는 manifest.json에 기록했습니다.

- 미리보기: ../../../../artifacts/shared-creatures-preview.html
- SQL Editor 한정 패치: ../../../../artifacts/shared-creatures-install.sql
- CLI migration: ../../../../supabase/migrations/20261018030010_shared_sea_creatures.sql
- 카탈로그 원본: ../../../../supabase/catalog/catalog.json

고둥류 3종은 사용자 지정 정면 예외이며 fixed입니다. 자동 상승·좌우 이동 없이 앞유리 층에 썸네일을 표시합니다. 시트도 함께 보관하지만 고정 표시에는 사용하지 않습니다. 나머지 9종은 오른쪽 원본 4프레임을 사용합니다.

원본 시트 셀은 627px입니다. 일부 원본의 그림 점유율이 기준 80~88%를 넘으므로 프레임 전체에 같은 렌더 배율 0.88을 적용하고 오른쪽 기준 위치 차이를 보정했습니다. PNG는 코드로 수정하지 않았습니다. sprite-audit.json은 알파 경계 측정이며 애니메이션 미감의 합격 판정은 아닙니다.

## 적용 상태

프로젝트 ewafafphiovbpjwogwzn에 이미지 24개 업로드 및 공개 URL SHA-256 대조 완료. 앱/Storage URL 일치와 REST/MCP의 기존 307종 카탈로그 지문 일치를 확인했습니다. DB INSERT는 MCP 읽기 전용 트랜잭션으로 차단되어 원격 신규 등록은 미적용입니다. 한정 패치는 해당 프로젝트 SQL Editor에서 실행할 수 있습니다. 전체 baseline이나 전체 카탈로그 migration을 기존 원격에 실행하지 않습니다.

타입 검사와 migration/서식지/반복 적용 보존 프레임 보정 포함 테스트 43개 통과. db:verify는 기존 supabase/sql/39~62와 동결 manifest 목록 차이 때문에 시작 단계에서 중단됩니다. 이번 작업에서 과거 SQL과 migration 이력은 변경하지 않았습니다.
