# 공통 개체와 구름나루 쓰레기

원본 생성은 built-in `image_gen`을 사용한다. 등급별 참고 이미지·최종 프롬프트·분류·판매가·출력 경로는 `manifest.json`, 생성 원본과 투명 배경 수정 내역은 `generated/`에 보존한다. 원본 PNG는 `assets/references/shared-ocean-20261022/`에서 보존한다.

신화 7종은 사용자 요청에 따라 3×2의 6프레임으로 제작했다. 어항과 도감이 같은 프레임 선택과 몸통 위치 보정을 사용하며, 모션 감소에서는 첫 프레임을 유지한다. 이전 앱도 잘못된 격자로 자르지 않도록 DB는 `_compat_sprite.png`의 2×2 기본 유영을 참조한다. 새 런타임은 이를 원래의 6프레임 `_sprite.png`로 전환해 추가 동작을 재생한다. 기존 8프레임 신화의 규격은 바꾸지 않는다.

`scripts/prepare-shared-collectibles.ps1`은 동일한 배율과 셀 중심을 모든 프레임에 적용하고, 고정된 몸통/머리 패치를 측정해 위치 보정을 생성한다. 개별 실루엣을 따로 확대하지 않는다. 썸네일은 첫 프레임에서 추출한다. 픽셀 측정 결과는 `registration.json`, 위치 보정은 `shared-expansion-frame-layouts.json`에 있다.

업로드는 `npm run storage:upload -- assets/storage-upload/new/20261022-041530`으로 수행한다. `scripts/register-shared-expansion.mjs`는 대상 프로젝트와 기존 ID를 확인하고 카탈로그 원본 또는 요청된 신규 종만 등록한다. 지역 종은 서식지를 먼저 만든 다음 주 서식지를 설정한다. 기존 보유 개체와 플레이어 지갑은 수정하지 않는다.

업로드 후 `scripts/verify-shared-expansion-assets.mjs`로 공개 파일의 해시를 비교한다. 원격 데이터 재조회 범위는 `remote-verification.json`, 파일 검증 범위는 `asset-verification.json`에 기록한다. 해당 기록은 전체 DB 구조나 migration 이력 일치의 증거가 아니다.
