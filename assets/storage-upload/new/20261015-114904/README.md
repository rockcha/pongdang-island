> 생성 배치 기록입니다. 현재 생성·저장 규칙은 [에셋 안내](../../../README.md)를 따릅니다.

# 해파리·꽃게·소라게 업로드

권장 일괄 업로드(프로젝트 루트에서 실행):

```powershell
npm.cmd run storage:upload -- assets/storage-upload/new/20261015-114904
```

최초 `.env.storage.local` 설정은 [업로드 안내](../../README.md#명령어로-일괄-업로드)를 따릅니다. Dashboard에서 폴더를 다시 올려 자동 병합하는 방식은 사용하지 않습니다. 수동이라면 기존 fish/normal·fish/rare를 각각 열고 PNG 파일만 업로드합니다.

생성 작업 시작: 2026-10-15 11:49:04 한국 시간. 새 투명 PNG 8장을 collectibles 버킷 내부 경로 그대로 정리합니다. **이 폴더 안의 fish 폴더**를 버킷 루트로 업로드합니다.

| 버킷 내 폴더 | 파일 | 개체 |
| --- | --- | --- |
| fish/rare | moonbell-jellyfish_thumbnail.png, moonbell-jellyfish_sprite.png | 달방울 해파리 · 안개달 토착 |
| fish/normal | peach-umbrella-jellyfish_thumbnail.png, peach-umbrella-jellyfish_sprite.png | 복숭아 우산해파리 |
| fish/rare | coral-claw-crab_thumbnail.png, coral-claw-crab_sprite.png | 산호집게 꽃게 · 산호빛 여울 토착 |
| fish/normal | pebble-hermit-crab_thumbnail.png, pebble-hermit-crab_sprite.png | 조약돌 소라게 |

업로드 후 [36번 SQL](../../../../supabase/sql/36-pulse-crawl-species/01-pulse-crawl-species.sql)을 실행합니다. 35번 이동 설정 SQL이 먼저 적용되어 있어야 합니다. 썸네일은 표시용 단일 그림, 시트는 2×2 동작 4프레임입니다. 모두 정면이며 그림 반전 없이 움직입니다.

생성 도구: 내장 image_gen. [최종 프롬프트·경로](manifest.json). README와 manifest는 업로드하지 않습니다.
