# 유물 이미지

Built-in image_gen으로 유물 16종을 개별 생성했다. 등급별 스타일 참고, 최종 프롬프트, 효과와 이미지 해시는 manifest.json에 보존한다. originals는 생성 원본이다. 유물은 고정 아이템으로 어항 배치·판매·선물·거래 대상이 아니다.

relics 경로는 투명도를 유지한 512px PNG이며 public/relics에서 로컬 앱에 제공한다. contact-sheet.png에서 전체 외형을 확인할 수 있다. 원격 Storage 업로드와 DB 적용은 별도로 진행해야 한다. 앱용 이미지는 public 경로로 제공하므로 Storage 업로드 없이 사용할 수 있다.
