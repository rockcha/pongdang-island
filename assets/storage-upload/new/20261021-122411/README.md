# 꽃게·해파리·거북이 인형

기존 인형과 같은 희귀 쓰레기이며 모든 해역에서 발견할 수 있도록 등록합니다. 카탈로그 원본은 `supabase/catalog/catalog.json`, 추가 등록 파일은 `supabase/migrations/20261021032416_plush_crab_jellyfish_turtle.sql`입니다. 기존 개체는 변경하지 않습니다.

`manifest.json`에 참고 그림의 역할, 생성 프롬프트, 보존한 원본, 최종 PNG 해시를 기록합니다. 퐁이 참고는 그림체, 기존 문어 인형은 봉제 질감과 수선 표현에 사용했습니다. 정적 썸네일을 사용하며 생물 유영 시트를 연결하지 않습니다.

캔버스 정규화: `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/prepare-collectible-batch.ps1 -Batch assets/storage-upload/new/20261021-122411`.

업로드: `npm.cmd run storage:upload -- assets/storage-upload/new/20261021-122411 --dry-run`으로 경로 확인 후 `--dry-run`을 빼고 실행합니다. 원격 DB 적용은 이미지 업로드와 별개이며, 적용 뒤 종과 서식지를 다시 확인해야 합니다. 실제 출시 확인 시점에만 신규 개체 표시의 출시 시각을 등록합니다.
