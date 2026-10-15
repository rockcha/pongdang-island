# 일반 장식물 3종

살구 불가사리(52px), 동글 따개비 무리(46px), 녹슨 꼬마 닻(58px)을 `kind=decoration`, `rarity=common`으로 추가합니다. 생물 모양 장식도 고정 장식물로 취급합니다.

1. `assets/storage-upload/collectibles/decorations/normal/`의 아래 PNG 세 장을 공개 `collectibles` 버킷의 같은 경로로 업로드합니다.
   - `apricot-starfish_thumbnail.png`
   - `round-barnacle-cluster_thumbnail.png`
   - `rusty-mini-anchor_thumbnail.png`
2. 기존 DB는 먼저 [25 장식물 전환·편집 SQL](../25-decoration-editing/01-decoration-editing.sql)을 실행하고, [01-common-decorations.sql](01-common-decorations.sql)을 실행합니다. 반복 실행할 수 있으며 보유 개체는 보존합니다. 예전 구조물 버전 24를 실행했어도 25로 전환 후 이 파일을 다시 실행하면 됩니다.
3. 마지막 조회에서 장식물 3종과 각 5개 서식지를 확인합니다.

초기 5개 해역에서 심해 인력석의 장식물 추첨 후보가 됩니다. 자동 유영·회전 없이 배치한 자리에 머물며, 드래그로 위치를 저장합니다. 누르면 회전(0~360°)·크기(0.5~2배)·가로/세로 위치를 미리 보고 저장할 수 있습니다. 처음 획득했을 때는 기존 장식물처럼 하단에 놓입니다. 불가사리와 따개비도 물고기로 분류하지 않습니다.

로컬 검증: `node scripts/verify-common-decorations.mjs`. 원격 DB 실행 및 Storage 업로드는 별도입니다.
