# 기존 ocean-map 제거

32까지 적용한 DB에서 [01-remove-ocean-map.sql](01-remove-ocean-map.sql)을 실행합니다. 33은 잠수부 수정이므로 별도로 적용합니다. 반복 실행 가능합니다.

기존 ocean-map 보유 개체 중 map_region_id가 유효한 것은 해당 지역의 map-지역ID 개체로 전환합니다. 개체 ID·소유자·획득 시각·낚시 기록 연결을 유지하고 새 지도 발견 기록도 등록합니다. 목적지 없는 예외 개체만 삭제하며 그 낚시 기록은 유지하고 collectible_id만 null로 변경합니다.

이후 기존 ocean-map 카탈로그·서식지·발견 기록을 제거합니다. 지역별 지도 5종과 player_map_fragments의 기존 해금 상태는 유지합니다. 과거 선물 JSON 등 역사적 스냅샷은 변경하지 않습니다. 지도는 원래 선물 발송 대상이 아닙니다.

로컬의 기존 ocean-map_thumbnail.png는 제거합니다. 원격 SQL 적용 후 사용하지 않는 collectibles 버킷의 map/normal/ocean-map_thumbnail.png도 삭제할 수 있습니다. 원격 DB 실행·Storage 삭제는 이 작업에서 수행하지 않습니다. 이전 설치 SQL의 ocean-map은 단계별 마이그레이션 재현을 위해 유지하며 최신 순서 끝에 34를 실행합니다.
