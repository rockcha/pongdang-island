# 해변 장식물 5종

27 적용 후 PNG 업로드 → [01-coastal-decorations.sql](01-coastal-decorations.sql) 실행 순서입니다. 원격 DB 적용은 SQL Editor에서 수행합니다. 반복 실행해도 기존 개체·발견·배치를 보존합니다.

이번 PNG는 요청대로 **assets/storage-upload/new 바로 아래**에 저장합니다. 로컬에서는 종류·등급별 폴더를 만들지 않습니다. 사용자가 Storage 업로드 시 아래 경로에 분류합니다. 버킷 이름은 **collectibles**입니다.

| 이름 | 등급 | 기본 크기 | 판매 골드 | Storage 대상 경로 |
| --- | --- | --- | --- | --- |
| 길 잃은 화살표 팻말 | 일반 | 56 | 40 | decorations/normal/lost-arrow-sign_thumbnail.png |
| 소라빛 바람개비 | 일반 | 56 | 40 | decorations/normal/seashell-pinwheel_thumbnail.png |
| 진주 품은 조개 | 일반 | 62 | 45 | decorations/rare/pearl-bearing-clam_thumbnail.png |
| 잠든 꼬마 난파선 | 희귀 | 90 | 190 | decorations/rare/sleeping-mini-shipwreck_thumbnail.png |
| 잠긴 우체통 | 희귀 | 64 | 170 | decorations/rare/sunken-mailbox_thumbnail.png |

모두 투명 배경의 정적 PNG이며 썸네일과 어항 표시 이미지를 겸합니다. 바람개비 회전 애니메이션은 포함하지 않습니다. 우체통에는 미역 줄기와 소량의 따개비를 표현합니다. 공통 5개 지역에 연결하고 기존 장식물 미끼의 추첨 방식을 유지합니다. 희귀 등급에 별도 확률 가중치는 추가하지 않습니다.

도감·보관함·도감의 임시 넣기에는 DB 카탈로그 조회로 자동 반영됩니다. 임시 넣기는 기존처럼 새로고침하면 사라집니다.

파일 매핑과 생성 프롬프트는 [coastal-decorations.json](../../../assets/storage-upload/new/coastal-decorations.json)에 기록합니다. 생성 도구는 내장 image_gen입니다.

29 업데이트부터 진주 품은 조개는 일반입니다. 기존 이미지 재업로드를 피하기 위해 rare 폴더의 이미지 경로는 유지합니다. 이미 28을 실행했다면 29 SQL로 등급과 판매가를 반영합니다.
