# 이미지 작업 규칙

개체(어종·쓰레기·장식물·지도) 이미지를 생성하거나 수정하기 전에 `assets/references/collectible-style/README.md`와 `assets/storage-upload/README.md`를 읽습니다. 등급에 맞는 실제 참고 PNG를 열어 확인하고 이미지 생성 도구의 스타일 참고로 전달합니다. 사용자가 매번 다시 첨부할 필요가 없도록 저장된 참고 이미지를 사용합니다.

- 일반(common)·희귀(rare): `assets/references/collectible-style/common-rare-pongi.png`의 퐁이 카툰풍.
- 특급(epic)·신화(mythic): `assets/references/collectible-style/epic-mythic-starlight.png`의 부드러운 판타지 일러스트풍. 퐁이 그림체에 보석만 더하는 방식으로 대체하지 않습니다.
- 참고 그림은 스타일 기준입니다. 같은 동물·색·무늬를 모든 개체에 복제하지 않습니다. 스크린샷 배경·체커보드·화면 UI를 결과에 넣지 않습니다.
- 기존 `collectibles/GENERATION.md`와 개별 manifest는 과거 생성 기록입니다. 그림체가 충돌하면 위 최신 등급별 기준을 우선합니다. 기존 에셋은 사용자 요청 없이 일괄 재생성하지 않습니다.
- 새 PNG는 `assets/storage-upload/new/YYYYMMDD-HHmmss/` 아래 Storage 경로 계층으로 저장하며 README·manifest에 참고 이미지와 최종 프롬프트를 기록합니다.
