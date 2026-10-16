# 태고의 원시섬

특급(epic) 지역, ID `primal`. 공룡 시대의 고사리 정글·화산·호박빛 안개와 청록빛 바다가 기준입니다. 선착장 풍경, 지도 조각, 낚시 배너, 장비를 같은 팔레트로 구성합니다.

- 지역 풍경: `regions/primal.png` (Storage).
- 지도 조각: `collectibles/map/epic/map-primal_thumbnail.png` (Storage), 종 ID `map-primal`.
- 지역 배너: `public/banners/primal-horizon.png`.
- 호박화석 낚싯대: `collectibles/equipment/rods/primal/`의 thumbnail·reel-frame·reel-rotor·float.

낚싯대는 기존 지역 장비와 같은 1,500골드, 반값 판매입니다. 실패율 감소 2%p·해당 지역 토착 개체 확률 증가 2%p를 설정·표시하며, 실제 낚시 확률에는 아직 적용하지 않습니다. 나무 몸체·화석 마디·호박 릴·호박 속 고사리 찌로 표현하고 기존 휘어짐·회전·게이지 동작을 그대로 사용합니다.

이번 범위는 지역·지도·배너·장비입니다. 공룡 개체와 지역 서식지는 후속 작업이며 다른 지역 생물을 임의로 복사하지 않습니다. 지역 조각을 해금할 수 있지만 정상 낚시 운영에는 후속 개체 카탈로그가 필요합니다.

신규 migration은 기존 지역·보유 개체·지갑·낚시 RPC를 변경하지 않습니다. 원격 카탈로그 등록과 migration 이력 등록은 별개이며 전체 baseline을 원격에 재실행하지 않습니다.
