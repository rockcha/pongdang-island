# 걷는 아틀란티스 수호병

과거 생성 배치 기록입니다. 현재 생성·저장 규칙은 [에셋 안내](../../../README.md)를 따르며 원격 반영 여부는 별도 확인합니다.

기존 신화 수호병의 외형을 유지하고 다리 교대 보행·팔 움직임·망토 흐름을 새 2×2 시트로 생성했습니다. 오른쪽 원본 네 프레임을 확인했습니다. 삼지창을 바닥에 고정하지 않고 들고 걷습니다. 썸네일은 기존 파일을 유지합니다.

Storage: `fish/mythic/atlantean-sentinel-walk_sprite.png`. 업로드 후 [SQL 57](../../../../supabase/sql/57-walking-atlantean-sentinel/01-walking-atlantean-sentinel.sql)을 56 다음에 실행합니다. `crawl`, 속도 0.012이며 신화 등급·별잠 토착·크기 150을 유지합니다.

내장 image_gen을 사용했습니다. 최종 프롬프트와 참고는 manifest.json, 알파 여백 검수는 alpha-report.json, 머리 기준점 보정은 frame-registration.json에 기록합니다. [보행 미리보기](preview.html)에서 제자리 재생을 볼 수 있습니다.

가장 넓은 자세의 긴 축 점유율은 87.9%이며 네 프레임 모두 셀 경계를 침범하지 않습니다. 관련 테스트 35개를 통과했습니다. 원격 DB에는 SQL을 실행하지 않았습니다.
