# 녹빛 고물섬 생성 배치

26종: 쓰레기5·장식품14·생물7. 개체33PNG, 지도1, 장비4, public 배경·배너·아이콘3 = 고유 이미지41개. 배너를 regions/scrapisle.png에도 사용한다.

내장 image_gen 사용. 일반·희귀는 assets/references/collectible-style/common-rare-pongi.png, 특급·신화는 epic-mythic-starlight.png를 실제 확인하고 참고로 전달했다. 각 썸네일을 승인 개체 참고로 사용하고 동일 위치의 가이드를 편집해 연결 동작을 생성했다. 최종 프롬프트·출처·해시는 manifest.json과 source JSON에 있다.

|이름|등급|분류|동작|프레임|
|---|---|---|---|---|
|찌그러진 꽁치 통조림|common|trash|swim|1|
|짝 잃은 장화|common|trash|swim|1|
|바닷물 먹은 신문지|common|trash|swim|1|
|구멍 난 냄비|common|decoration|fixed|1|
|버려진 카세트테이프|common|trash|swim|1|
|멈춘 알람시계|common|decoration|fixed|1|
|젖은 오리인형|common|trash|swim|1|
|녹청빛 선풍기|rare|decoration|fixed|1|
|바퀴 잃은 자전거|rare|decoration|fixed|1|
|잠긴 여행 가방|rare|decoration|fixed|1|
|따개비 전화기|rare|decoration|fixed|1|
|고장 난 잠수 헬멧|rare|decoration|fixed|1|
|잊힌 태엽 로봇|rare|decoration|fixed|1|
|물먹은 오르골|rare|decoration|fixed|1|
|해초 감긴 쇼핑카트|rare|decoration|fixed|1|
|산호 품은 폐자동차|epic|decoration|fixed|1|
|잠든 심해 자판기|epic|decoration|fixed|1|
|녹슨 등대 렌즈|epic|decoration|fixed|1|
|버려진 탐사 로봇|epic|fish|crawl|4|
|침몰한 고물 운반선|epic|decoration|fixed|1|
|마지막 수거선, 그린아크|mythic|fish|swim|8|
|깡통집 소라게|rare|fish|crawl|4|
|병뚜껑 방패게|rare|fish|crawl|4|
|전구집 문어|rare|fish|fixed|4|
|타이어 곰치|rare|fish|fixed|4|
|고철갑옷 철갑상어|epic|fish|swim|4|

## 검수

alpha-audit.json: 알파16 기준 외곽·셀 경계. uniform-framing.json: 개체33PNG에 시트 전체 동일 배율·좌표 적용. body-registration.json: 생물7종의 단단한 몸통/고정 받침대 기준 보정. 개별 프레임 확대·자동 중심 정렬은 하지 않는다. 그린아크는 선체 크기를 유지하며6초마다 크레인 수거 동작을 한다. 실제 기기 DPR 검수는 별도다.

## 적용

이미지 업로드·해시 검증: node artifacts/upload-scrapisle.mjs

사용자가 수동 SQL 전달을 선택했다. Supabase SQL Editor에서 artifacts/scrapisle-install.sql 전체를 실행한다. 기존 지도 상점이 설치된 프로젝트가 전제다. 새 테이블이나 정책을 재생성하지 않으며 기존 플레이어·지갑·보유 개체를 변경하지 않는다. 신규26종의 서식지만 갱신한다. 다른 해역의 낚시 확률은 유지하고 고물섬 일반 낚시에만 등급 내 물건80% 우선 추첨을 적용한다. 로컬 migration은20261017093723_scrap_isle_region_and_species.sql. migration history는 자동 변경하지 않았다.

미리보기: artifacts/scrapisle-preview.html. SQL 실행과 앱 배포는 별도다. 원격 관리 토큰401 때문에 원격 SQL 함수 상태는 미확인이다.

실제 업로드 확인: upload-verification.json에39개 Storage 파일의 공개 SHA256 일치 기록. SQL은 실행하지 않음. db:verify는 기존 legacy manifest01–38과 추가39–62 목록 불일치로 중단되며 이 이력은 수정하지 않음.

최종 검증: 관련7개 테스트 파일61개 테스트 통과, TypeScript/Vite 빌드 통과. 초기 크레인 프레임 타이밍 검증에서 발견한 문제를 고물섬 그린아크 전용4초 평상시+2초 수거 주기로 수정했으며 기존 신화 동작은 유지했다.
