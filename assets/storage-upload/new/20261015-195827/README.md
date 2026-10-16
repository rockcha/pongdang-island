# 천년산호 거대게 걷기 시트

기존 디자인을 유지하고 다리의 교대 보행과 집게발 여닫기를 새로 생성했습니다. 머리와 등껍질은 프레임별 기준점 보정으로 안정화합니다. 기존 썸네일은 유지합니다.

- 경로: `collectibles/fish/mythic/ancient-coral-giant-crab-walk_sprite.png`
- 1254×1254 투명 PNG, 2×2 프레임. 모든 다리와 집게가 셀 안에 들어갑니다.
- 신화 그림체 참고와 기존 거대게 이미지를 생성 도구에 전달했습니다.
- `alpha-report.json`: 읽기 전용 알파 검사. `frame-registration.json`: 머리 기준점 이동 측정. 프레임별 크기 변경 없음.
- SQL: `supabase/sql/50-shared-coral-and-walking-crab/01-shared-coral-and-walking-crab.sql`. 49 다음에 실행합니다.
- SQL 50은 나비고기·홍련 지느러미돔·홍옥 눈동자 곰치·꽃너울 해파리를 모든 현재 해역의 공통 개체로 바꾸고 설명을 수정합니다. 거대게는 산호 토착종을 유지하며 느리게 걷습니다.

업로드 명령: `npm run storage:upload -- assets/storage-upload/new/20261015-195827`
업로드 검증 결과는 `upload-report.json`에 기록합니다. 원격 SQL 실행은 별도입니다.
