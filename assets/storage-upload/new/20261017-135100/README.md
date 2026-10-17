# 태고의 원시섬 개체 확장

요청한 생물 20종과 장식물 14종을 모두 `primal` 전용으로 등록합니다. 기존 종·보유 개체·골드·선물 이력은 변경하지 않습니다.

| 분류 | 일반 | 희귀 | 특급 | 신화 |
| --- | --- | --- | --- | --- |
| 생물 | 9 | 5 | 5 | 1 |
| 장식물 | 8 | 5 | 1 | 0 |

총 57개 PNG: 썸네일 34개, 생물 시트 20개, 수초 시트 3개. 일반·희귀는 퐁이 카툰, 특급·신화는 별빛 가오리의 부드러운 일러스트 스타일을 참고했습니다. 생성 도구는 기본 제공 `image_gen`이며, 최종 프롬프트·참고 역할·원본 파일·Storage 경로는 `manifest.json`에 기록합니다. 수정 전 생성 기록은 `generation-sources.json`, 후속 여백 수정 기록은 `final-sources.json`입니다.

생물은 모든 프레임이 오른쪽 원본입니다. 일반·희귀·특급 생물은 2×2 유영 4프레임, 검은파도의 왕 플리오스는 4×2의 8프레임입니다. 플리오스는 6초 주기 중 후반에 턱에서 꼬리로 파도 문양이 밝아집니다. 회전·불투명도 혼합·크기 맥동은 사용하지 않습니다.

넓은잎 물고사리·자주빛 갈래해초·거대 부채 물고사리는 고정된 뿌리 위로 잎이 움직입니다. DB의 장식물 `sprite_sheet_path=null` 계약을 보존하고, 수조에서 검토된 로컬 시트로 연결합니다. 해당 PNG는 `public/aquarium/plants/`에도 동일하게 복사됩니다. 나머지 장식물은 정지 이미지입니다.

프레임 위치는 단단한 머리·껍데기·뿌리의 패치를 기준으로 측정했습니다. `body-registration.json`은 원본 좌표 측정값, `alpha-audit.json`은 알파 16 이상 경계 측정값입니다. 프레임별 확대 보정은 하지 않습니다. 이 검사는 실제 모바일 기기의 시각적 재생 검증을 대신하지 않습니다.

수초와 일부 작은 생물은 잎·촉수의 동작 여유를 위해 긴 축 점유율을 80%보다 작게 두었습니다. 모든 시트는 90% 이하의 범위에서 셀 가장자리에 알파 여백을 유지하도록 검수합니다.

- 미리보기: [전체 갤러리](../../../../artifacts/primal-expansion-preview.html)
- 요청 목록과 디자인: [계획 데이터](../../../../artifacts/primal-expansion-plan.json)
- 등록 SQL: [34종 전용 migration](../../../../supabase/migrations/20261017045143_primal_prehistoric_species.sql)

`npm run storage:upload -- assets/storage-upload/new/20261017-135100`으로 폴더 안의 PNG를 기존 `collectibles` 버킷 경로에 업로드합니다. 생성시간 폴더 자체는 버킷 경로에 넣지 않습니다. 업로드 이후 공개 PNG의 SHA-256 확인 결과는 `upload-verification.json`, 실제 원격 34종·서식지 확인 결과는 `remote-registration.json`에 저장됩니다. 이 두 기록은 전체 스키마나 migration history가 일치한다는 뜻이 아닙니다.

로컬 migration 재생과 대상 테스트는 수행하되, 전체 `db:verify`는 작업 전부터 있던 legacy SQL 39~62와 동결 목록 불일치로 실패합니다. 과거 SQL이나 baseline을 수정하지 않습니다.
