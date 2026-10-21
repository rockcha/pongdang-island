# 루네아와 태고 스페셜 배경

사용자가 지정한 이름과 가격으로 별도 스페셜 배경 두 종을 추가합니다. 기존 태고의 뿌리 바다는 유지합니다. 연분홍 진주빛과 에메랄드 화석 테마를 구분하고, 중앙은 실제 물고기가 보일 낮은 대비의 유영 공간으로 남깁니다.

생성 도구는 built-in `image_gen`이며 원본 경로·최종 프롬프트·업로드 경로는 `manifest.json`에 기록했습니다. 현재 상점 정보의 기준은 `supabase/catalog/catalog.json`입니다.

`node scripts/upload-aquarium-backgrounds.mjs assets/storage-upload/new/20261021-151542 --dry-run` 후 `--upload`로 업로드합니다. 기존 파일을 덮어쓰지 않으며 공개 다운로드 해시를 비교합니다. DB 검증 후 `20261021061542_add_lunea_and_emerald_aquarium_themes.sql`만 적용하고 두 카탈로그 행과 이미지 접근을 재확인합니다.
