# 별잠 유적 · 파랑과 노랑

현재 등록된 별잠 토착 16종을 사용자 확정 상어 시안의 파랑·노랑 채색과 곡선 문양으로 교체한다. 삼지창 표식은 쓰지 않으며 생물별 체형과 기존 이동 유형을 보존한다. 기본 제공 `image_gen`으로 제작했다. 최종 프롬프트와 입력 역할은 manifest.json, 생성 원본은 sources/*.source에 보존한다.

단단한 눈·머리·등껍질·찻잔·받침대를 실제 원본에서 선택해 RGB 평행 이동을 측정했다. 전체 동작에 한 배율과 한 중심을 적용하고 프레임별 이동을 최종 PNG에 반영했다. 프레임별 크기 조절이나 실루엣 자동 가운데 정렬을 하지 않는다. 런타임은 이미 정렬된 PNG에 과거 보정을 중복 적용하지 않는다. 수호병은 제자리에 고정된 8프레임·6초 주기이며 모션 감소에서는 0프레임을 유지한다.

이미지는 public 정적 에셋과 기존 카탈로그 경로의 명시적 매핑으로 도감·어항에 함께 연결한다. 가격·획득·출시 시각·카탈로그·원격 Storage는 변경하지 않았다. 앱 배포 전까지 운영 화면에는 적용되지 않는다. 제작 범위 확인을 위해 대상 프로젝트 ewafafphiovbpjwogwzn의 토착 개체 경로·이동 설정만 읽었으며 전체 원격 구조를 비교한 작업은 아니다.

검증은 원본 여백 검사(audit.json), 실제 불투명 패치(anchor-config/results), 최종 PNG 재측정(final-verification.json), 실제 도감·Phaser 어항의 로컬 재생(preview-verification.json)을 구분한다. 재측정은 `artifacts/align-starruins-bluegold.mjs`와 `scripts/register-sprite-anchors.ps1`, 연결 생성은 `artifacts/pack-starruins-bluegold.mjs`를 사용한다. 회귀 검사는 `npx.cmd vitest run tests/starruins-bluegold-art.test.ts tests/mythic-swim.test.ts tests/coral-starruins-art.test.ts`, 공통 검사는 `npm.cmd run client-data:check`와 `npm.cmd run build`다.

개발 서버에서 `/artifacts/starruins-bluegold-preview.html`을 열면 제자리 반복 재생·프레임 넘기기·밝고 어두운 배경·실제 도감·어항을 확인할 수 있다. 검수 이미지와 배치 가이드는 artifacts/starruins-bluegold-review 및 artifacts/starruins-bluegold-guides에 두며 업로드 대상에서 제외한다. audit 도구 재실행 시 배치 안에 생성되는 review PNG는 archive-starruins-bluegold.mjs로 다시 분리한다.
