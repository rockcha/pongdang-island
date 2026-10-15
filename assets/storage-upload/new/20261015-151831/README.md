# 퐁당섬 앞바다 고유 개체 3종

2026-10-15 생성 배치입니다. 현재 기준은 [에셋 안내](../../../README.md)를 따릅니다.

| 개체 | 등급 | 게임 크기 | 가치 | 서식지 |
| --- | --- | --- | --- | --- |
| 퐁당 상어 | 특급 | 156px | 720 | 퐁당섬 앞바다 |
| 퐁당 고래 | 특급 | 172px | 780 | 퐁당섬 앞바다 |
| 퐁이 탐사선 | 신화 | 176px | 2200 | 퐁당섬 앞바다 |

탐사선은 퐁이가 조종하는 해저 잠수정으로 구성했습니다. 세 개체 모두 수조에서 유영하는 `fish` 분류이며 새 원본은 오른쪽을 바라봅니다. 왼쪽 이동 시 런타임에서 좌우 반전합니다.

## 참고와 검수

후속 유영 안정화: PNG를 변경하지 않고 `src/features/aquarium/swim-frame-layout.ts`에 프레임별 머리·몸통 위치·배율 보정을 추가했습니다. 고래 하단 프레임은 96px 샘플 기준 약 -17px의 수직 차이가 있어 보정합니다. 평상시 유영의 자동 기울기를 제거하고 좌우 반전·드래그 논리 좌표와 보정값이 충돌하지 않게 처리했습니다. 기준 시트를 교체할 때 이 보정값을 재검토합니다.

- 생성 도구: built-in image_gen. [특급·신화 참고 PNG](../../../references/collectible-style/epic-mythic-starlight.png)를 실제로 확인하고 그림체 참고로 전달했습니다. 부드러운 판타지 일러스트와 색 윤곽·그라데이션·투명감을 적용했습니다.
- 탐사선 탑승자는 `public/branding/pongi.png`를 동일 캐릭터 참고로 사용했습니다.
- 썸네일을 생성한 뒤 해당 최종 썸네일을 각 스프라이트의 동일 개체 참고로 사용했습니다.
- 2×2 프레임 순서는 열린 눈 / 반쯤 감긴 눈 / 감긴 눈 / 열린 눈입니다. 상어·고래는 꼬리와 지느러미, 탐사선은 추진기·안정판·퐁이 눈의 차이를 확인했습니다.
- 네 프레임 모두 오른쪽을 바라보며 실제 알파 투명 PNG입니다. 고래와 탐사선은 칸별 여백을 보완했습니다. PNG 헤더·정사각형·RGBA·균등 분할·업로드 용량 제한 검사를 통과했습니다.
- 새 세 시트는 평소 열린 눈 프레임으로 유영하고 개체별 4~6초마다 약 0.22초 동안 눈을 깜빡입니다. 모션 감소 시 첫 프레임으로 고정합니다. 구현: `src/features/aquarium/premium-swim-frame.ts`.
- 최종 프롬프트와 여백 보완 프롬프트는 [manifest.json](manifest.json)에 저장했습니다.

## 적용 상태

PNG 6장은 `collectibles` 버킷에 아래 상대 경로 그대로 업로드했고 SHA-256 비교로 검증했습니다.

```text
fish/epic/pongdang-shark_thumbnail.png
fish/epic/pongdang-shark_sprite.png
fish/epic/pongdang-whale_thumbnail.png
fish/epic/pongdang-whale_sprite.png
fish/mythic/pongi-explorer_thumbnail.png
fish/mythic/pongi-explorer_sprite.png
```

새 종은 원격 DB API의 단일 서식지 제약으로 등록이 중단되어 아직 카탈로그에 없습니다. [41 등록 SQL](../../../../supabase/sql/41-pongdang-natives/01-pongdang-natives.sql)을 SQL Editor에서 한 번 실행해야 합니다. 종과 서식지를 한 트랜잭션으로 등록하며 반복 실행할 수 있습니다. 바다악어 크기·퐁이 석상 서식지는 원격 DB에 별도로 적용하고 검증했습니다.

검증: `node scripts/verify-pongdang-natives.mjs`, 관련 Vitest, 프로덕션 빌드.
