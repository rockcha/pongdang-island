# 루네아 자장가 라벤더 색상 수정

사용자 요청에 따라 기존 구도와 연분홍 진주빛을 유지하면서 물과 조명에 보랏빛을 더했습니다. built-in `image_gen` 편집을 사용했으며 참고 원본·최종 프롬프트·생성 원본은 `manifest.json`에 있습니다.

기존 상품 ID는 `lunea-pink-lullaby`이고 이미지 파일만 `lunea-pink-lullaby-v2.png`로 변경합니다. 새 상품을 추가하지 않습니다. 새 파일명으로 CDN 캐시 충돌을 피하며 이전 원본은 보존합니다.

`node scripts/upload-aquarium-backgrounds.mjs assets/storage-upload/new/20261021-151906 --upload` 후 공개 다운로드 해시를 확인하고 `20261021061906_lunea_lullaby_lavender_image.sql`만 적용합니다. 원격 상품의 이미지 경로를 재조회합니다.
