# 낚싯대 릴·찌 이미지

2026-10-16 built-in image_gen 생성. 첫물결(기본 지급), 퐁당 나무, 산호꽃, 안개달 4종의 투명 배경 고정 테두리·회전판·찌 12개와 첫물결 세트 썸네일을 생성했습니다. 기존 7종 썸네일도 함께 Storage로 옮겼습니다. 최종 프롬프트는 [manifest](manifest.json)에 있습니다.

Storage 경로는 `collectibles/equipment/rods/{id}/{thumbnail|reel-frame|reel-rotor|float}.png`입니다. 20개 업로드 후 원격 다운로드와 로컬 SHA-256 일치를 확인했습니다. 이미지 원본은 수정하지 않고 `rod-image-assets.tsx`에서 회전축·찌 몸통 중심을 맞춥니다. 회전·게이지·휘어짐·확률은 기존 로직을 사용합니다. 나머지 4종의 릴·찌는 SVG입니다.
