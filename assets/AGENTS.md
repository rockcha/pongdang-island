# 이미지 작업 규칙

스프라이트는 개체의 구조·이동 방식과 물살에 반응할 요소를 먼저 고려해 설계합니다. 움직일 부위를 꼬리·지느러미로 한정하지 않습니다. 흐르는 촉수·몸 가장자리·장식·천·추진기 등 개체에 맞는 요소를 선택하고, 움직이지 않아야 자연스러운 부위는 안정적으로 유지합니다. 한쪽 앞지느러미만 팔처럼 크게 젓는 동작을 피합니다. 네 프레임을 눈 상태만으로 구성하지 않습니다. 머리·몸통 기준점과 크기를 고정하고 제자리 재생에서 위아래 떨림이 없는지 확인합니다. 특급·신화일수록 유영 동작과 반복 연결을 더 세심하게 검수하며, 눈깜빡임은 부가 표현으로 추가합니다. 세부 기준은 [생성·검수 기준](references/collectible-style/README.md)을 따릅니다.

개체(어종·쓰레기·장식물·지도) 이미지를 생성하거나 수정하기 전에 `assets/references/collectible-style/README.md`와 `assets/storage-upload/README.md`를 읽습니다. 등급에 맞는 실제 참고 PNG를 열어 확인하고 이미지 생성 도구의 스타일 참고로 전달합니다. 사용자가 매번 다시 첨부할 필요가 없도록 저장된 참고 이미지를 사용합니다.

- 일반(common)·희귀(rare): `assets/references/collectible-style/common-rare-pongi.png`의 퐁이 카툰풍.
- 특급(epic)·신화(mythic): `assets/references/collectible-style/epic-mythic-starlight.png`의 부드러운 판타지 일러스트풍. 퐁이 그림체에 보석만 더하는 방식으로 대체하지 않습니다.
- 참고 그림은 스타일 기준입니다. 같은 동물·색·무늬를 모든 개체에 복제하지 않습니다. 스크린샷 배경·체커보드·화면 UI를 결과에 넣지 않습니다.
- 기존 [초기 생성 기록](storage-upload/collectibles/generation-history.md)와 개별 manifest는 과거 생성 기록입니다. 그림체가 충돌하면 위 최신 등급별 기준을 우선합니다. 기존 에셋은 사용자 요청 없이 일괄 재생성하지 않습니다.
- 새 PNG는 `assets/storage-upload/new/YYYYMMDD-HHmmss/` 아래 Storage 경로 계층으로 저장하며 README·manifest에 참고 이미지와 최종 프롬프트를 기록합니다.
- 새 어종은 썸네일과 스프라이트의 모든 프레임에서 머리가 화면 오른쪽을 향하고 앞으로 유영하는 원본으로 만듭니다. 생성 후 실제 이미지를 확인하며, 왼쪽·정면 원본은 새 어종의 최종본으로 채택하지 않습니다. 사용자 지정 예외가 있으면 그 지시를 따릅니다. [방향 규칙과 기존 왼쪽 어종 목록](references/collectible-style/artwork-facing.md)을 반드시 확인하고, 기존 어종은 검토된 방향 값을 보존합니다.
