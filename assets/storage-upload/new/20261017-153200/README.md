# 백야의 빙해 신규 32종

생물 23종(일반 8 / 희귀 7 / 특급 6 / 신화 2), 장식품 9종(일반 3 / 희귀 3 / 특급 3). 전부 백야 토착이며 다른 해역에는 추가하지 않았다. 기존 공통 개체·기존 보유 데이터는 보존한다.

일반·희귀는 `assets/references/collectible-style/common-rare-pongi.png`의 카툰 그림체, 특급·신화는 `epic-mythic-starlight.png`의 부드러운 판타지 그림체를 직접 참고했다. 내장 image_gen 사용. 생성 이력과 선택 원본·프롬프트는 `generation-sources.json`, 최종 55개 파일은 `manifest.json`에 기록한다.

썸네일 32장 + 4프레임 시트 21장 + 신화 8프레임 시트 2장. 가리비·말미잘은 fixed 개체로 밑부분을 고정한다. 장식품은 정적 썸네일이다. 니벨라는 눈꽃 날개를 펼치고, 맘모르는 엄니·어깨 문양이 빛난다. 신화 행동은 기존 6초 재생기를 사용한다.

알파 16 이상을 기준으로 모든 셀 경계 픽셀 0을 확인했다(`alpha-audit.json`). 일부 시트는 80~88% 점유율 목표보다 여백이 크다. 촉수·엄니 잘림 방지를 위해 시트 전체에 동일한 여백 보정을 요청했으며 프레임별 자동 확대는 하지 않았다. 몸통/고정 받침의 위치는 `body-registration.json`의 패치 비교로 측정했고 렌더링 원점만 보정한다. 실제 모바일 기기 재생 검증을 의미하지는 않는다.

미리보기: `artifacts/whitenight-expansion-preview.html`. SQL: `artifacts/whitenight-species-install.sql` 또는 CLI migration `20261017064137_whitenight_native_species.sql`. 이미 백야와 지도 상점이 있는 DB에 신규 종만 추가한다. 전체 지도 상점 설치 SQL을 다시 실행할 필요는 없다.

Storage: `npm run storage:upload -- assets/storage-upload/new/20261017-153200`. 버킷은 collectibles, 생성 폴더 아래 상대 경로를 그대로 사용한다. 원격 등록 기록과 이미지 해시 검증은 별도 JSON에 남기며 migration history 전체가 적용됐다는 뜻은 아니다.
