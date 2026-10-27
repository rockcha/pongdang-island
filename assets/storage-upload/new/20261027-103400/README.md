# 약탈자의 항로 아이콘과 해적 낚싯대

내장 `image_gen`으로 해적 깃발 지역 아이콘과 해적 낚싯대 썸네일·릴 테두리·회전판·찌를 제작했다. 기존 냠냠 장비의 재질 표현과 부품 구조만 참고하고 검은 목재·붉은 가죽·황동·해골 깃발·나침반 문양으로 구분했다. 사용한 참고와 최종 프롬프트는 manifest·generation에, 생성 원본은 sources에 보존한다.

지역 아이콘은 공용 regionIcons에 연결하고 public에서 제공한다. 원본을 보존한 채 작은 아이콘용 해상도로만 최적화했다. 장비 부품은 collectibles Storage의 equipment/rods 경로로 제공하며 공개 다운로드 바이트 해시를 검증한다. 버전이 필요한 교체 시 기존 이미지를 덮어쓰지 않고 새 경로를 연결한다.

회전판의 실제 축과 고정 프레임 중심·찌 몸통 위치를 보고 rod-image-assets의 표시 원점을 조정했다. 회전·게이지·휘어짐·조작 영역은 기존 컴포넌트를 사용하고 이미지 실패 시 해적 SVG 재질로 대체한다. 밝고 어두운 배경의 외곽과 모바일·데스크톱 실제 릴 회전을 함께 검수한다.

가격 원본은 카탈로그다. 이번 CLI migration은 해적 낚싯대 추가와 기존 냠냠 낚싯대 가격만 다루며 보유·장착·지갑을 직접 변경하지 않는다. 해적 낚싯대의 효과는 기존 해역 장비와 같은 규칙을 사용한다. 기존 원격·로컬 migration 이력 차이는 복구하지 않았다. 두 행의 적용 후 조회 범위는 artifacts/pirate-rod-deployment.json에 남긴다.

검증은 plunder-rod-sql·nyamnyam-rod-sql·rod-image-assets·rod-skin-art·rod-gauge 테스트와 이 배치의 audit·storage-verification·preview-verification을 사용한다. artifacts/pirate-rod-review.html에서 실제 장비 컴포넌트를 확인할 수 있다.
