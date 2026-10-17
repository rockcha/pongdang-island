# 백야의 빙해

ID `whitenight`. 안개달 다음, 별잠 유적 앞에 표시한다. 지도는 등급 없이 지도 상점에서 3,500골드에 구매한다. 기존 플레이어 데이터는 변경하지 않는다.

전용 장비는 **백야 서리 낚싯대**(1,500골드). 실패율 −2%p, 해당 해역 토착 개체 확률 +2%p로 다른 지역 낚싯대와 동일하다.

기존 공통 개체와 신규 백야 토착 32종이 서식한다. 생물 23종(일반 8, 희귀 7, 특급 6, 신화 2), 장식품 9종(일반 3, 희귀 3, 특급 3)이다. 다른 지역 전용 개체나 원시섬 개체는 가져오지 않는다. 니벨라·맘모르의 신화 서식지 등록으로 원래 신화 확률이 자동 복원된다. 다른 해역 확률은 그대로다.

신규 그림체는 등급별 참고 파일을 사용한다. 일반·희귀는 퐁이, 특급·신화는 별빛 가오리 기준이다. 21종은 4프레임, 신화 2종은 8프레임과 6초 행동을 사용한다. 가리비·말미잘은 고정형이며 장식품은 정적 이미지다. 에셋과 검수 기록은 `assets/storage-upload/new/20261017-153200/`, 미리보기는 `artifacts/whitenight-expansion-preview.html`에 있다. 신규 종 등록 SQL은 `artifacts/whitenight-species-install.sql`이다.

이미지: 밝은 극지 하늘과 청록 빙벽 배경, 빙하가 그려진 두루마리 지도, 은빛 눈꽃 릴과 얼음 찌의 장비 썸네일, 얼음 발판 낚시 화면. 낚싯대 본체·릴·찌는 기존 SVG 장비 시스템으로 움직인다.

- 해역 원본: `assets/storage-upload/new/white-night/regions/whitenight.png`
- 지도·장비 원본: 같은 폴더의 `map/routes/`, `equipment/rods/whitenight/`
- 배너: `public/banners/whitenight-horizon.png`
- 낚시 배경: `public/fishing/environments/whitenight.png`

등록 migration: `supabase/migrations/20261017060959_whitenight_region_catalog.sql`, 순서 수정: `20261017061438_place_whitenight_after_mistmoon.sql`. 기존 지도 상점용 통합 업데이트는 `artifacts/whitenight-install.sql`과 `artifacts/map-shop-install.sql`에 동일하게 제공한다. 테이블을 생성하지 않으며 재실행할 수 있다. 백야가 아직 없는 DB와 이미 추가된 DB 모두 지원한다.

Storage 업로드 검증은 `assets/storage-upload/new/white-night/remote-assets.json`. DB migration 원격 실행 완료의 증거가 아니다. 로컬 PGlite 검사도 원격 준비/완료 낚시 함수와의 일치를 보장하지 않는다.

기존 DB용 업데이트는 실행 대상의 `native_region_id is null`을 확인한 개체에만 서식지를 추가한다. 원격에서 퐁당 전용으로 지정된 `pongi-statue` 등을 공통 개체로 바꾸거나 기존 서식지를 삭제하지 않는다. 로컬 카탈로그와 원격 토착 지정 차이는 보존한다.
