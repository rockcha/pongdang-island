# 농장 폐기 아이콘

로컬 농장 UI 전용 아이콘으로 DB 개체나 판매 상품이 아니다. built-in image_gen으로 생성했으며 참고 이미지 역할과 최종 프롬프트는 manifest.json에 보존한다.

원본을 sources/discard-basket-generated.source에 보존한다. prepare.mjs는 비율을 유지해 투명 512px 정사각형에 축소하고 전체 알파 범위를 포함한 viewBox를 생성한다. 색상 수정이나 배경 제거는 하지 않는다. 런타임 파일은 public/farm/art/v5/ui/discard-basket.png이며 원격 업로드는 하지 않는다.

재현: node assets/storage-upload/new/20261103-213522/prepare.mjs

검증: scripts/audit-collectible-images.mjs로 원본 정규화·최종 PNG의 투명 여백을 검사하고 밝은/어두운 배경 및 실제 말풍선·결과창에서 확인한다.
