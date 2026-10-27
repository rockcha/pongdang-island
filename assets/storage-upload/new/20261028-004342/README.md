# 직접 낚시 발견 확률 유물

정적 투명 아이콘 6개. 내장 image_gen으로 각 아이콘을 따로 생성했으며 최종 프롬프트와 스타일 참고는 manifest.json에 보존합니다.

이미지 감사 → 밝은색·어두운색 및 게임 표시 크기 검수 → Storage 업로드와 공개 바이트 해시 확인 → 신규 효과 migration과 카탈로그 migration 순서로 적용합니다. 검수용 PNG는 업로드 대상에 섞이지 않도록 artifacts/discovery-relics-review로 옮깁니다.

SQL: supabase/migrations/20261027154037_direct_discovery_relic_effects.sql, supabase/migrations/20261027154041_six_discovery_relic_catalog.sql. 원격 검증 범위는 이 두 변경에 한정하며 전체 구조 비교를 대신하지 않습니다.
