# 잠들지 않는 수확종

특급 유물의 정적 아이콘이다. `image_gen` built-in 도구로 생성했으며 스타일 참고의 역할과 최종 프롬프트는 `manifest.json`에 남긴다. 참고의 채색·재질만 사용하고, 도자기 톱니 손잡이·청동 종체·호박색 종추를 가진 물건으로 설계했다. 모든 가장자리의 실제 알파를 밝은 배경과 어두운 배경에 합성해 확인했다. 원본은 `generated/sleepless-harvest-bell.source`에 PNG 바이트로 보존한다.

저장소 루트에서 `npm run storage:upload -- assets/storage-upload/new/20261026-103604 --dry-run`으로 범위를 검토한 뒤 같은 명령의 `--dry-run`을 빼고 실행한다. 파일명을 재사용해 덮어쓰지 않는다. 압축 후 공개 바이트 해시는 manifest에 기록하며 카탈로그는 버전이 있는 공개 Storage URL을 사용한다. 알림 아이콘에는 같은 파일을 `public/relics/epic/`에서 제공한다.

이 유물은 기존 낚시 유물 추첨에 참여하며 개별 플레이어에게 지급하지 않는다. 판매가는 기존 특급 유물 기준을 따른다. 연료·미끼 생산소만 서버에서 수령하며 개인 공방·통발·항해·적금·후원에는 적용하지 않는다. 장착·만료·한도·중복 지급·서버 작업과 재현 절차는 [생산소 운영 원칙](../../../../docs/systems/production.md#생산소-자동-수령-유물)을 따른다.

DB 변경은 CLI로 생성한 `20261026013805_sleepless_harvest_bell_auto_claim.sql`, 카탈로그 원본에서 생성한 `20261026014036_sleepless_harvest_bell_catalog.sql`, 잠금 중인 시설을 건너뛰고 만료를 재확인하는 `20261026015533_harvest_bell_nonblocking_expiry_guard.sql`이다. 로컬 검증과 운영 배포는 구분하며, 대상 프로젝트 확인·원본 함수 해시·신규 migration·공개 이미지·실제 Cron·합성 계정 롤백 검증은 `scripts/db/harvest-bell-remote.mjs`에서 수행한다. 조회 자료는 `supabase/inspection/remote/harvest-bell/`에 보존하며 전체 원격 구조의 동등성을 뜻하지 않는다.
