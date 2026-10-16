# 태고의 원시섬 · 특급

내장 image_gen으로 지역 풍경·지도 조각·배너와 호박화석 낚싯대 세트 7종을 생성했습니다. 원본은 변경하지 않고 복사했습니다. 최종 프롬프트·참고 이미지 역할·원본 경로·소비 경로는 manifest.json을 확인합니다.

지도는 기존 지도 조각의 구도와 특급 스타일 참고를 사용했습니다. 릴 프레임은 기존 프레임을 원형·투명 영역 구도 참고로 사용했습니다. 모든 산출물을 직접 열어 구도·재질·중심·여백을 검수했습니다. 릴의 회전축은 중앙, 찌는 몸체 중앙을 기존 변환 기준으로 사용합니다. 별도 이미지 가공은 하지 않았습니다.

Storage 대상은 regions/primal.png와 collectibles/map/epic/map-primal_thumbnail.png, collectibles/equipment/rods/primal/ 아래 네 부품입니다. 배너는 public/banners/primal-horizon.png에서 사용합니다. 업로드 검증 기록은 upload-result.json입니다.

카탈로그 기준은 supabase/catalog/catalog.json, 후속 SQL은 20261016120119_primal_island_catalog.sql입니다. 원격 카탈로그 등록에는 서버 전용 키로 Data API를 사용하며, SQL 실행이나 migration history 변경을 의미하지 않습니다. 신규 공룡 개체·서식지는 이번 범위에 포함하지 않습니다.
