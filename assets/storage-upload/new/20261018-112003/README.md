# 녹빛 고물섬 신규 생물 7종

생성은 내장 image_gen을 사용했습니다. 등급별 스타일 참고와 최종 프롬프트, SHA256은 manifest.json에 있습니다. 원본 방향은 썸네일과 네 프레임 모두 오른쪽입니다. 동작은 촉수·지느러미·다리·외투막·연주하는 팔을 중심으로 구성했고, 몸통 위치 차이는 registration.json의 측정값을 수조 프레임 보정에 반영했습니다. 실제 브라우저 재생 검수는 별도로 필요합니다.

PNG는 collectibles 버킷에 이 폴더 기준 상대 경로로 업로드합니다. 업로드 후 공개 URL 응답과 파일 해시를 검증합니다. 카탈로그 등록은 supabase/migrations/20261018112003_scrap_island_seven_creatures.sql을 사용합니다. 이 파일은 신규 카탈로그 migration이며, 과거 baseline을 실행하지 않습니다.

sprite-audit.json은 알파 여백 검사, registration-config.json과 registration.json은 몸통 위치 측정의 재현 자료입니다. 최종 28프레임 모두 알파 임계값 32에서 셀의 네 가장자리에 투명 여백이 있습니다. 수조에서는 시트 전체에 동일한 배율을 적용해 가장 큰 자세의 긴 축 점유율을 84%로 맞췄습니다. 일반 골무 따개비는 부착형 생물이므로 눈을 추가하지 않았습니다.
