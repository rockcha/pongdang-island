# 해역별 아쿠아리움 배경

기존 먹빛·산호·달빛·구름·빙해 배경과 겹치지 않는 여섯 해역을 추가합니다. 중앙의 낮은 대비와 넓은 빈 공간을 유지해 실제 물고기와 장식이 잘 보이게 합니다. 생물·문자·UI는 배경에 포함하지 않습니다.

원본 PNG와 최종 프롬프트, 해역 대응, Storage 경로는 `manifest.json`에 있습니다. 생성 도구는 built-in `image_gen`입니다. 카탈로그의 가격·등급은 `supabase/catalog/catalog.json`이 기준입니다.

검증 및 배포 순서:

1. `node scripts/upload-aquarium-backgrounds.mjs assets/storage-upload/new/20261021-150650 --dry-run`
2. 같은 명령의 `--upload`로 새 파일을 업로드합니다. 기존 파일을 덮어쓰지 않으며 공개 다운로드 SHA-256을 비교합니다.
3. DB 검증 후 `20261021060650_add_regional_aquarium_backgrounds.sql`만 적용합니다. 다른 미적용 이력을 한꺼번에 push하거나 baseline을 재실행하지 않습니다.
4. 원격 여섯 카탈로그 행과 공개 이미지 접근을 확인합니다.
