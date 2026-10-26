# 꿈먹는 심연 추가 개체

이미지는 built-in `image_gen`으로 생성했다. 등급별 스타일 참고는 채색·재질에만 사용하고, 동일성 확정 썸네일과 반복 배치 가이드로 동작을 만들었다. 개체별 최종 프롬프트·입력 역할·이동 판단은 `manifest.json`에 보존한다. 원본은 `generated/*.source`로 보존하며 확장자와 무관하게 PNG다.

확인이 없었던 세부 사항은 심연의 몽유자를 희귀로, ‘라일락 해상’을 해삼으로 해석했으며 신화의 이름은 잠든 고대 생명체로 정했다. 기존 카탈로그 가격은 바꾸지 않는다.

## 재현·검수

저장소 루트에서 `node assets/storage-upload/new/20261026-033245/audit-raw.mjs`로 원본 셀 여백과 기준 패치를 확인한다. `scripts/register-sprite-anchors.ps1`에 four/eight 설정을 각각 Columns 2/4로 전달하고 결과를 배열로 합쳐 `raw-registration.json`에 저장한다. `prepare-sheets.mjs`는 측정한 이동량만 보정하고 모든 자세에 하나의 배율·중심을 적용한다. 최종 설정도 같은 방식으로 측정한 후 `final-registration.json`으로 합치고 `connect-layouts.mjs`로 앱의 위치 보정과 신화 공개 파일을 갱신한다.

`raw-audit.json`은 후처리 전 알파 32 기준 경계를 기록한다. 신화는 모든 셀에서 8% 이상 여백을 검사한다. 옅은 알파·윤곽은 실제 밝은 배경, 어두운 배경, 어항 합성에서도 확인한다. 투명 픽셀의 RGB가 도구 미리보기에서 보이는 현상만으로 외곽 오염을 판정하지 않는다. 공통 윤곽 규칙은 [스타일 기준](../../../references/collectible-style/README.md)에 있다.

신화의 첫 네 장은 유영, 뒤 네 장은 목과 지느러미의 준비·전개·복귀·안정이다. 눈은 계속 감고 있으며 6초 주기로 재생한다. 카탈로그에는 이전 앱에서도 읽는 2×2 호환 시트를 연결하고, 새 앱은 같은 개체를 등록된 4×2 시트로 재생한다. 호환 시트는 첫 네 자세를 재배치한 것이며 새로 확대하지 않는다.

검증은 `tests/dreamabyss-creatures.test.ts`, 전체 `tests/mythic-swim.test.ts`, DB 관리 문서의 필수 SQL 테스트와 `npm run db:verify`를 사용한다. 실제 어항·도감 반복과 모션 감소 검수는 `artifacts/verify-dreamabyss-ui.mjs`로 재현한다. 합성 개체만 사용하며 플레이어 계정이나 보유 데이터를 쓰지 않는다.

## 업로드·DB 적용

`npm run storage:upload -- assets/storage-upload/new/20261026-033245 --dry-run`으로 범위를 검토한 뒤 같은 명령에서 `--dry-run`을 빼고 실행한다. 무손실 압축 후 파일 해시는 manifest의 files에 기록한다. 이미 등록한 버전 파일은 덮어쓰지 않는다.

DB 변경은 CLI가 만든 `supabase/migrations/20261025184854_dreamabyss_ten_creatures.sql`이며 카탈로그 원본에서 대상 ID만 생성했다. 원격 조회·적용·재확인은 `scripts/db/dreamabyss-creatures-remote.mjs`가 담당한다. 이 도구는 대상 프로젝트, 이미지 공개 해시, 신규 ID와 해역을 확인하며 기존 카탈로그·플레이어 데이터·과거 이력을 수정하지 않는다. 결과는 `supabase/inspection/remote/dreamabyss-creatures/verification.json`에 남는다. 전체 원격 구조 비교나 프런트엔드 운영 배포의 증거로 사용하지 않는다.
