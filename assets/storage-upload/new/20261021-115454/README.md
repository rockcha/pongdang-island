# 공통 개체 추가 배치

개체 설정의 원본은 `supabase/catalog/catalog.json`, 제작 입력은 `artifacts/shared-collectibles-expansion-plan.json`입니다. `manifest.json`은 등급별 참고 이미지, 실제 프롬프트, 생성 원본 경로와 최종 PNG 해시를 기록합니다. 부캉이는 사용자 확인에 따라 상어 봉제인형으로 제작합니다.

이미지 정규화는 `scripts/prepare-collectible-batch.ps1 -Batch assets/storage-upload/new/20261021-115454`를 사용합니다. 생성 원본을 보존하며, 스프라이트의 모든 셀에 동일한 크기·좌표 변환을 적용합니다. 프레임별 자동 확대는 하지 않습니다. 신화 어종은 4×2, 다른 어종은 2×2이며 정적 장식품·쓰레기는 썸네일을 사용합니다.

신화 원본의 기본 유영과 추가 행동은 `mythic-swim.ts`에서 어항·도감 미리보기에 함께 연결합니다. 추가 행동은 6초 주기이며 메갈로돈은 마지막 1.8초, 무귀환호는 마지막 2.4초입니다. 모션 감소에서는 첫 프레임을 유지합니다.

업로드는 저장소 루트에서 `npm.cmd run storage:upload -- assets/storage-upload/new/20261021-115454 --dry-run`으로 경로를 확인한 뒤 같은 명령에서 `--dry-run`을 빼고 실행합니다. 기존 파일을 덮어쓰는 옵션은 사용하지 않습니다.

DB 등록 파일은 `supabase/migrations/20261021025451_shared_collectibles_and_tall_decorations.sql`입니다. 새 ID만 등록하며 기존 가격이나 플레이어 데이터는 수정하지 않습니다. 원격과 로컬의 기존 가격 차이는 이 배치로 동기화하지 않습니다. DB 적용 후 새 ID와 서식지, 공개 이미지 해시를 다시 조회해야 합니다. 로컬 검증 통과를 원격 적용 완료로 해석하지 않습니다.

실제 DB 출시가 확인된 시각에 `src/features/regions/species-releases.json`에 이 배치의 종 ID와 시간대가 포함된 출시 시각을 추가합니다. 이미지 제작 시각을 출시 시각으로 사용하지 않습니다. 이후 7일 노출은 기존 신규 개체 UI에서 처리합니다.

검증: `npm.cmd run db:verify`, `npx.cmd vitest run tests/shared-collectible-expansion.test.ts tests/mythic-swim.test.ts tests/inhabitant-motion.test.ts`, `npx.cmd tsc -b`.
