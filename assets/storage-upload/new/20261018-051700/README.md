# 퐁당섬 고유개체와 공통 신화

2026-10-18 KST 제작 배치. 내장 image_gen 사용. 최종 프롬프트와 참고 역할은 manifest.json에 기록합니다.

## 구성

- 공통 신화 5종: 수평선고래, 이름먹는 소라, 별을 삼킨 제사장, 오르페온, 심연의 성가(한 개체명), 신탁의 삼면어. 현재 카탈로그의 10개 해역에 모두 서식합니다.
- 퐁당섬 앞바다 고유종: 희귀 물고기 퐁당 복어·문어·해마, 특급 퐁당 고래, 희귀 쓰레기 퐁이 인형.
- 퐁당 시리즈는 머리에 불가사리를 얹습니다. 퐁이 인형은 기존 퐁이 마스코트를 봉제 인형으로 표현했습니다.
- 썸네일 10개와 오른쪽 원본 2×2 유영 시트 9개. 인형은 썸네일을 물살에 떠다니는 쓰레기 표현에 사용합니다.

## 참고와 검수

일반·희귀는 assets/references/collectible-style/common-rare-pongi.png, 특급·신화는 epic-mythic-starlight.png를 스타일 참고로 사용했습니다. 시트는 개체별 컨셉 썸네일을 동일성 참고로 생성했습니다. 최종 썸네일은 채택한 스프라이트 첫 프레임에서 추출해 어항과 도감의 외형을 일치시켰습니다. 생성 입력은 references/collectible-style/20261018-pongdang/concepts/에 보존했습니다.

네 프레임에 동일한 88% 배율과 여백을 적용했습니다. 신탁의 삼면어는 여백을 확보한 재생성본을 원본 배율로 사용합니다. 프레임별 자동 크롭·확대는 하지 않습니다. 머리/몸통의 실제 이동은 anchor-registration.json에서 측정하고 앱의 경로별 프레임 원점 보정에 반영합니다. sprite-audit.json은 알파 32 기준 점유율 측정이며 원격 Storage나 실제 모바일 품질의 증거가 아닙니다.

## DB 및 업로드

- 카탈로그 원본: supabase/catalog/catalog.json.
- 신규 migration: 20261017201704_allow_rare_collectible_trash.sql → 20261017201709_pongdang_natives_and_shared_mythics.sql.
- 희귀 쓰레기를 막던 로컬 collectible_nonfish_common 제약만 제거합니다. 기존 개체·소유 데이터·지갑을 삭제하지 않습니다.
- 로컬 PGlite 재생과 실제 원격 적용은 별개입니다. 기존 원격 구조는 docs/db/REMOTE_REVIEW.md와 차이가 있으므로 baseline 재실행·history repair·reset을 하지 않습니다.
- db:verify는 기존 supabase/sql/39 이후 파일과 동결 manifest 목록 불일치로 중단됩니다. 이번 배치에서 해당 과거 파일을 수정하거나 삭제하지 않았습니다.

명령은 저장소 루트에서 실행합니다.

    npm.cmd run storage:upload -- assets/storage-upload/new/20261018-051700 --dry-run
    npm.cmd run storage:upload -- assets/storage-upload/new/20261018-051700

업로드 대상은 fish/ 및 trash/ 아래 최종 PNG만입니다. 참고 atlas는 assets/references/collectible-style/20261018-pongdang/에 분리했습니다.

## 완료된 검증

최종 PNG 19개를 collectibles 버킷에 업로드하고 공개 URL의 SHA-256을 로컬 파일과 대조했습니다(storage-verification.json). 기존 퐁당 고래 경로는 덮어쓰지 않고 starfish-v1 경로로 분리했습니다. DB·움직임·프레임 방향 관련 테스트 166개와 TypeScript 검사가 통과했습니다. 신규 migration의 원격 DB 적용은 하지 않았습니다.

미리보기: artifacts/pongdang-creatures-preview.html. 실제 기기에서의 프레임 재생 품질은 별도 시각 확인이 필요합니다.
