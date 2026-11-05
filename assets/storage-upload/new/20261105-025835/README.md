# 수중 도시 어항 배경

사용자가 선택한 수중 도시 거리 두 시안의 원본을 보관합니다. 물고기가 보이는 중앙 여백과 수중 빛을 유지하며 이미지 자체에 UI나 개체를 포함하지 않습니다.

프롬프트와 해시는 manifest.json, 현재 가격과 상품 정보는 supabase/catalog/catalog.json이 원본입니다. 기존 이미지를 덮어쓰지 않고 새 버전 경로로 업로드합니다.

`node scripts/upload-aquarium-panoramas.mjs --manifest assets/storage-upload/new/20261105-025835/manifest.json`으로 업로드 후 공개 해시를 확인하고, `20261104175835_underwater_city_aquarium_themes.sql`을 적용합니다. 파노라마 등록과 상점 미리보기는 프런트엔드 배포에 포함합니다.
