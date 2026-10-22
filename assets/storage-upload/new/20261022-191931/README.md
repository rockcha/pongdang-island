# 금전·보물 쓰레기

일반·희귀는 퐁이 참고의 갈색 윤곽·따뜻한 카툰 채색, 특급 금고는 별빛 가오리 참고의 채색·광택만 적용한다. 사물에 얼굴을 붙이지 않는다. 생성 도구·최종 프롬프트·원본 파일·Storage 경로는 manifest에 보존한다.

사용자가 판매가를 직접 지정한 금전·보물 예외다. 기존 쓰레기 가격대를 기준으로 낮추거나 다른 종의 가격을 변경하지 않는다. 모두 전 해역 공통이며 무거운 물체·가라앉은 전리품으로 해석해 `fixed`, 바닥 높이 범위, 좌우 반전 없음으로 명시한다. 과거 DB 제약은 쓰레기의 양수 speed를 요구하므로 호환값을 저장하지만 fixed 렌더링에서는 이동에 사용하지 않는다. 정적 썸네일만 사용하며 유영 시트를 만들지 않는다. 실제 어항 모션 테스트로 바닥 근처 배치·정지·수동 위치 보존을 확인한다.

`node artifacts/prepare-treasure-trash.mjs`로 최종 원본을 배치하고 카탈로그에 추가한다. CLI가 생성한 빈 migration에 `db:catalog`를 `collectible_species` 및 이 배치 ID들로 한정해 생성한다. `db:context`, `db:verify`와 어항 모션 테스트를 통과시킨다.

`npm.cmd run storage:upload -- assets/storage-upload/new/20261022-191931` 뒤 `node artifacts/prepare-treasure-trash.mjs --finalize`로 업로드 바이트의 크기·해시를 기록한다. `node artifacts/treasure-trash-remote.mjs preflight|apply assets/storage-upload/new/20261022-191931`는 대상 프로젝트·종 ID/이름 충돌·해역을 확인하고 공개 이미지 해시가 맞을 때에만 새 종과 서식지를 추가한다. 적용 뒤 요청값과 서식지를 재조회하고 실제 출시 시각을 신규 개체 목록에 기록한다. 전체 원격 구조나 migration history의 동등성은 이 범위 검증으로 주장하지 않는다.
