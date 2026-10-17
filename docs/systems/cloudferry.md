# 지브리의 구름나루

해역 ID `cloudferry`. 기존 순서를 보존하고 심연 다음, 9번째로 추가한다. 등급 없는 지도는 2,500골드, 구름나루 바람 낚싯대는 1,500골드다. 장비 효과는 실패율 −2%p, 토착 개체 확률 +2%p다. 전용 개체 25종이 있으며 일반 9·희귀 8·특급 7·신화 1종이다.

물가 왼쪽 멀리에는 센과 치히로의 행방불명의 붉은 목욕탕, 오른쪽 언덕에는 하울의 움직이는 성이 보이는 풍경이다. 초록 섬, 낮게 흐르는 구름, 청록빛 바다, 작은 나루를 손그림 애니메이션·수채화 질감으로 구성했다. 낚시 화면은 두 건물을 먼 수평선에 두고 낚시 영역을 넓게 비웠다.

내장 image_gen으로 해역 풍경·낚시 배경·지도·장비 썸네일 4장을 생성했다. 배너와 해역 아이콘은 풍경에서 파생했다. 원본 및 프롬프트는 `assets/storage-upload/new/cloudferry/`; 앱 에셋은 `public/banners/cloudferry-horizon.png`, `public/fishing/environments/cloudferry.png`, `public/region-icons/cloudferry.png`다. 실제 낚싯대는 기존 SVG 애니메이션 시스템에 대나무·초록 바인딩·구름 릴·청록 찌 디자인을 추가했다.

토착 해역이 없는 공통 생물·장식품과 구름나루 전용 25종을 함께 배치한다. 다른 해역 전용 및 원시섬 개체는 포함하지 않는다. 신화 하울의 움직이는 성의 서식지 등록으로 신화 확률이 자동 활성화된다. 다른 해역 확률은 변경하지 않는다.

원본 카탈로그 편집 후 `db:catalog`로 생성한 SQL에서 신규 해역·지도·서식지만 추려 검토하고 장비 및 확률 함수를 추가했다. migration: `20261017082326_cloudferry_region_catalog.sql`. 기존 지도 상점이 설치된 원격 DB용 SQL은 `artifacts/cloudferry-install.sql`; 테이블 생성이나 기존 종·플레이어 데이터 삭제 없이 재실행할 수 있다. 원격의 토착 지정 차이를 존중하도록 실제 `native_region_id is null`인 종만 서식지를 추가한다.

이미지 업로드 확인은 `remote-assets.json`의 SHA256을 참고한다. 이미지 업로드와 로컬 PGlite 검증은 원격 DB 등록 완료의 증거가 아니다. 원격 등록은 별도 SQL 적용이 필요하다.

검증: `tests/cloudferry-region.test.ts`, `tests/map-shop-sql.test.ts`, `tests/whitenight-region.test.ts`.

## 전용 생물·장식품 확장

생물 22종, 장식품 2종, 쓰레기 1종이며 썸네일·시트 합계 47개 PNG다. 하울의 성은 `crawl` 8프레임과 6초 창문 불빛 행동, 다른 생물은 4프레임을 사용한다. 일반·희귀는 퐁이 참고, 특급·신화는 별빛 가오리 참고를 바탕으로 지브리 캐릭터를 제작한다. 오른쪽 원본, 실제 알파 여백, 시트 전체에 동일한 프레이밍, 고정 몸통 등록을 적용한다.

개체별 동작·프롬프트·검수 기록은 `assets/storage-upload/new/20261017-175022/README.md`와 manifest에 있다. 신규 migration은 `20261017085502_cloudferry_native_species.sql`, 별도 설치 SQL은 `artifacts/cloudferry-species-install.sql`이다. 원격 카탈로그 확인 범위는 해당 배치의 `remote-registration.json`을 참고하며 로컬 검증을 원격 적용 증거로 사용하지 않는다. 검증: `tests/cloudferry-expansion.test.ts`.

## 토토로 디테일 업데이트

해역 아이콘은 `public/region-icons/cloudferry-totoro.png`의 이끼 낀 토토로 석상이다. 낚시 찌는 `public/fishing/equipment/cloudferry-totoro-float.png`의 토토로 모양 목제 찌이며 기존 찌 위치·회전·판정은 유지한다. 로딩 실패 시 같은 모티브의 SVG로 대체한다. 장비 썸네일의 찌도 토토로로 수정했다. 지도는 풍경·목욕탕·움직이는 성·항로를 보존하며 작은 토토로·검댕이·지지 카메오를 추가한다.

내장 image_gen으로 아이콘·찌 생성과 지도·장비 썸네일 편집을 수행했다. 원본·프롬프트·업로드 검증은 `assets/storage-upload/new/cloudferry/totoro-revision/`에 기록한다. 지도와 장비 썸네일의 Storage 경로는 유지하며 앱 URL에 `v=totoro-2`를 붙여 기존 브라우저 캐시를 갱신한다. DB 변경이나 SQL 재실행은 필요하지 않다.
