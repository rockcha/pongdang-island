# 한강의 불빛나루 제작 배치

이미지는 built-in image_gen으로 제작했다. 실제 프롬프트·참고 역할·생성 원본은 manifest와 sources에 보존한다. 일반·희귀는 퐁이 스타일, 특급·신화는 별빛 참고의 채색만 사용한다. 물고기는 오른쪽 원본이며 이동 방식·높이·판매가의 운영 원본은 supabase/catalog/catalog.json이다.

스프라이트는 4프레임 또는 신화 8프레임으로 생성하고, 정렬 스크립트는 불투명 고정 패치의 이동을 측정해 같은 패딩과 역방향 평행 이동을 PNG에 반영한다. registration.json과 raw-sprite-audit.json에 원본 여백·패치·RMSE·RGBA 보존 근거를 남긴다. review의 실제 패치와 반복 재생을 확인한 뒤 공개한다. 같은 그림을 복사한 placement guide는 생성 입력일 뿐 최종 시트가 아니다.

업로드는 scripts/publish-hangang-assets.mjs를 사용한다. 최종 에셋만 임시 폴더로 분리하여 기존 업로드 도구로 무손실 압축·업로드하고, 압축한 파일을 원래 배치에도 반영한다. 공개 다운로드의 SHA-256을 다시 대조한다. 검사와 업로드 완료, 운영 앱 배포는 별도로 확인한다.
