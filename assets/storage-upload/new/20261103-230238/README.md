# 농장 밭·성장 단계 이미지

농장 지도에서 쓰는 로컬 UI 이미지다. DB 개체·판매 품목·이동 시스템과 무관하며 원격 업로드는 하지 않는다.

built-in image_gen으로 빈 밭을 생성하고, 그 원본을 정확한 구도 참고로 사용해 심은 직후·새싹·어린 잎 작물·어린 밀을 생성했다. 원본은 sources/*-generated.source에 보존하고 참고 역할·최종 프롬프트·공개 파일 해시는 manifest.json에 남긴다.

prepare.mjs는 원본 비율을 유지해 투명 512px 정사각형으로 축소한다. 모든 단계는 동일한 viewBox를 사용하므로 단계별 자동 확대나 위치 보정을 하지 않는다. PNG 색과 알파를 임의로 수정하거나 배경을 제거하지 않는다.

재현: node assets/storage-upload/new/20261103-230238/prepare.mjs

검수: scripts/audit-collectible-images.mjs의 원본 정규화·최종 검사, 밝은/어두운 배경 비교, 실제 밭의 심기·성장·수확 흐름에서 고정 크기와 단계 전환을 확인한다.
