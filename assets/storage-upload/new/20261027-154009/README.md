# 기계신의 성소 제작

사용자 요청의 59종과 지도 조각 6개를 제작한다. 이미지 생성은 built-in imagegen을 사용하며 일반·희귀는 승인한 태엽멸치와 퐁이 카툰, 특급·신화는 저장된 판타지 일러스트 스타일을 참조한다. plan.json은 생성 전 이동·가격·외형 계획이며 최종 데이터 원본은 supabase/catalog/catalog.json이다. manifest.json에 실제 프롬프트와 원본·최종 파일을 기록한다. 미검수 이미지는 공개 카탈로그에 연결하지 않는다.

스프라이트는 생성된 실제 동작을 사용한다. `layout-guides/`의 반복 썸네일은 위치·여백을 지시하는 입력 자료이며 최종 애니메이션으로 사용하지 않는다. `.source/`에 생성 원본을, `.source/rejected/`에 교체 전 시안을 보존한다. `prepare-sprites.mjs`는 원본 셀의 잘림을 먼저 검사하고 셀 전체에 동일 배율·여백을 적용한다. 머리·고정 몸통의 불투명 패치를 측정해 등록하며, 이동하는 집게·촉수·개폐하는 눈 대신 고정 머리·테두리를 선택한 범위는 `anchor-patches.json`에 남긴다. 넓은 여백은 종 전체의 런타임 배율로 보상한다.

`registration.json`은 원본 경계·최종 경계·실측 위치 보정을 기록한다. `manifest.json`의 해시는 무손실 압축 후 공개 다운로드와 비교한 최종 바이트 기준이다. 원본을 최종본으로 재복사하거나 스프라이트를 재생성한 뒤에는 위치 보정·공개 해시·최적화 썸네일도 함께 갱신한다.

업로드는 `finalize.mjs`로 만든 `tmp/mechsanctum-upload`에만 수행한다. 생성 원본·배치 가이드와 `public/` 배경은 버킷에 섞지 않는다. `npm run storage:upload -- tmp/mechsanctum-upload` 후 `verify-upload.mjs`로 공개 바이트를 검증하고 최적화된 바이트를 배치로 반영한다. 신규 DB 변경은 CLI migration `20261027065049_mechsanctum_region_and_collectibles.sql`이며, 기존 운영 DB의 이력을 일괄 재생하지 않는다.

검증: `tests/mechsanctum-art.test.ts`, `tests/mechsanctum-region.test.ts`, `tests/mythic-swim.test.ts`, `npm run db:verify`, `npm run build`. 이미지 업로드와 앱·DB 배포는 별도 작업이다.
