# 바다악어 이미지 교체

47 이후 적용합니다. `assets/storage-upload/new/20261015-191500/`의 PNG 2개를 collectibles 버킷에 같은 하위 경로로 올린 뒤 `01-sea-crocodile-refresh.sql`을 실행합니다. v2 파일명을 사용해 기존 파일과 캐시를 구분합니다.

기존 개체 ID·소유권·서식지·등급·가치·size는 유지합니다. 오른쪽 원본에 맞게 facing_direction과 썸네일·스프라이트 경로만 갱신합니다. 원격 SQL 적용은 별도입니다.
