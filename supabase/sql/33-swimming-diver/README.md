# 잠수부 퐁당이 유영 개체 수정

32를 이미 실행했다면 새 PNG 2장을 업로드한 뒤 [01-swimming-diver.sql](01-swimming-diver.sql)만 실행합니다. 아직 32를 실행하지 않았다면 수정된 32가 처음부터 유영 개체로 등록합니다. 33은 반복 실행 가능합니다.

분류는 fish(유영 개체), 등급은 특급, 토착은 퐁당 앞바다입니다. 크기 82·판매가 650은 유지하고 높이 20~75%·속도 .040을 적용합니다. 기존 보유 개체·어항 배치·발견 기록은 유지하며 선물의 개체 스냅샷도 새 이미지와 분류로 갱신합니다.

새 PNG는 `assets/storage-upload/new/regional-fishing/`에 저장합니다. 내장 image_gen으로 기존 잠수복 디자인을 참고해 수평으로 헤엄치는 썸네일과 2×2 시트를 생성합니다.

| 파일 | collectibles 버킷 경로 |
| --- | --- |
| diver-pongdang-swimming_thumbnail.png | fish/epic/diver-pongdang-swimming_thumbnail.png |
| diver-pongdang-swimming_sprite.png | fish/epic/diver-pongdang-swimming_sprite.png |

기존 로컬 `diver-pongdang_thumbnail.png`는 제거합니다. 새 이미지 업로드와 SQL 반영 후 Storage의 `decorations/epic/diver-pongdang_thumbnail.png`도 삭제할 수 있습니다. 원격 Storage 삭제·DB 실행은 여기서 수행하지 않습니다.
