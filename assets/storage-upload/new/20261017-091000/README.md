# 루네아 8프레임 유영

회전 시트를 퇴역하고 머리카락·꼬리 유영 동작을 새로 생성했습니다. 모든 몸통은 오른쪽을 향하며 5번째 포즈에서 잠깐 정면을 봅니다. 앱은 6초 주기에서 일반 유영을 길게, 정면 응시 구간을 짧게 재생합니다.

내장 image_gen 사용. 프롬프트는 [manifest.json](manifest.json), 알파 진단은 [alpha-report.json](alpha-report.json)에 있습니다. 8개 셀 모두 알파 200 기준 경계 픽셀 0입니다. 가슴 영역을 첫 프레임과 비교한 이동량으로 각 프레임의 원점을 보정합니다. 공통 배율 1.15를 유지하며 프레임별 크기 변화·반투명 혼합은 없습니다. 미리보기는 앱의 mythic-swim.ts에서 생성한 함수를 함께 사용합니다. 실제 재생 화면의 최종 시각 검수는 별도입니다.

원본은 `fish/mythic/lunea-mistmoon-goddess_swim8_sprite.png`, 앱 파일은 `public/aquarium/swim/lunea-mistmoon-goddess_swim8_sprite.png`입니다. 원본 DB 카탈로그·Storage는 변경하지 않고 클라이언트에서 신화 루네아에만 적용합니다. 기존 회전 시트는 과거 생성 기록이며 사용하지 않습니다.
