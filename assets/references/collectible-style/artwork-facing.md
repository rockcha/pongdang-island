# 어종 원본 방향 규칙

2026-10-15 사용자 확정: 앞으로 만드는 새 어종은 오른쪽을 향한 원본으로 통일합니다. 어종 이미지 생성·교체·등록 전에 이 문서를 확인합니다.

오른쪽 고정은 원본 이미지에만 적용합니다. 게임에서는 왼쪽 이동 시 좌우 반전하고 오른쪽 이동 시 원본으로 복귀하여 항상 머리부터 진행합니다. 이동하는 측면 어종은 과거 `flip_with_direction=false` 값으로 이 반전을 차단하지 않습니다. 기존 왼쪽 원본은 아래 예외 목록에 따라 반대로 처리합니다.

## 새 이미지 생성과 검수

- 오른쪽은 보는 사람 기준 화면 오른쪽입니다. 머리·입·주둥이는 오른쪽, 몸통·꼬리는 그 뒤쪽에 놓고 앞으로 유영하는 자세로 만듭니다.
- 썸네일과 스프라이트의 네 프레임 모두 동일한 오른쪽 방향을 유지합니다. 프레임 간에는 지느러미·꼬리·눈깜빡임만 바꾸며 몸의 방향을 바꾸지 않습니다.
- 생성 프롬프트에 아래 문구를 넣고, 업로드 전에 실제 PNG를 열어 썸네일과 네 프레임을 각각 검수합니다. 왼쪽을 향하거나 정면이거나 방향이 섞인 결과는 새 어종의 최종본으로 채택하지 않고 재작업합니다.
- 해파리·게처럼 정면 표현을 쓰고 싶더라도 기본 규칙을 임의로 예외 처리하지 않습니다. 사용자가 별도로 지정한 경우에만 예외를 기록합니다.
- 새 어종의 `facing_direction`은 검수한 결과에 따라 `right`로 등록하고, 좌우 유영 시 `flip_with_direction=true`로 사용합니다. `travel_direction`은 이동 경로 설정으로, 오른쪽 원본 규칙과는 별개입니다. 왼쪽으로 이동할 때는 앱에서 좌우 반전하여 머리부터 진행합니다.
- 배치 README와 manifest에 원본 방향 `right`, 썸네일 및 네 프레임의 검수 결과를 기록합니다. 앞으로 새 어종을 추가할 때마다 기존 이미지 전체를 재판별할 필요는 없습니다.

필수 프롬프트 문구:

> Face SCREEN RIGHT in a clear side or side-three-quarter profile. The head, mouth and snout point to the right; the body and tail trail behind to the left. Show forward swimming toward the right, never backward swimming. Keep this exact right-facing orientation in the thumbnail and ALL FOUR animation frames. No left-facing, front-facing, mirrored or alternating-direction frames.

## 기존 왼쪽 원본 예외

아래 14종은 Storage의 실제 2×2 시트 네 프레임을 확인한 왼쪽 원본입니다. 새 오른쪽 원칙을 소급 적용하지 않습니다. 원본을 그대로 사용하는 동안 `facing_direction=left`와 기존 이미지 경로별 보정 값을 유지하여 오른쪽 진행 시 반전합니다. 왼쪽 진행 시에는 원본 그대로 표시합니다.

| 어종 ID | 검토한 Storage 경로 |
| --- | --- |
| aurora-eel | fish/epic/aurora-eel_sprite.png |
| bean-pufferfish | fish/normal/bean-pufferfish_sprite.png |
| coral-bean-shrimp | fish/normal/coral-bean-shrimp_sprite.png |
| coral-crowned-turtle | fish/epic/coral-crowned-turtle_sprite.png |
| coralfan-butterflyfish | fish/rare/coralfan-butterflyfish_sprite.png |
| flower-coral-seadragon | fish/rare/flower-coral-seadragon_sprite.png |
| glassfin-lionfish | fish/rare/glassfin-lionfish_sprite.png |
| orange-clownfish | fish/normal/orange-clownfish_sprite.png |
| pearl-parrotfish | fish/rare/pearl-parrotfish_sprite.png |
| petal-nudibranch | fish/rare/petal-nudibranch_sprite.png |
| pinkchin-blenny | fish/normal/pinkchin-blenny_sprite.png |
| ribbon-eel | fish/normal/ribbon-eel_sprite.png |
| sea-crocodile | fish/rare/sea-crocodile_sprite.png |
| threadtail-shrimp | fish/normal/threadtail-shrimp_sprite.png |

기존 정면·좌우 방향 없는 원본 13종의 `front` 값은 과거 시각 검토 기록으로만 보존합니다. 실행 중 반전을 금지하는 값으로 사용하지 않고 오른쪽 기준으로 처리합니다. 이동하는 모든 어종은 `flip_with_direction=false` 여부와 관계없이 왼쪽 진행 시 반전합니다. 위 왼쪽 원본 14종만 반대 기준으로 처리하며, 검토한 이미지 경로의 방향은 오래된 DB 값보다 우선합니다. 전체 50종의 방향·경로·이미지 SHA-256은 [검토 기록](../../../src/features/aquarium/artwork-facing.json), 과거 DB 등록 SQL은 [39 원본 방향 SQL](../../../supabase/sql/39-artwork-facing/01-artwork-facing.sql)에 있습니다.

기존 이미지를 오른쪽 원본으로 교체하는 작업은 별도 요청이 있을 때 수행합니다. 교체 시 실제 프레임을 다시 검수하고, DB 방향 값·클라이언트 검토 기록·이 문서의 예외 목록을 함께 갱신합니다. 원본 이미지를 바꾸지 않고 DB 값만 `right`로 덮어쓰지 않습니다.

## 바다악어 v2 교체

48 SQL의 fish/rare/sea-crocodile-v2_sprite.png는 오른쪽 원본입니다. 기존 fish/rare/sea-crocodile_sprite.png는 왼쪽 예외로 유지합니다. 경로별 검수 값으로 구분합니다.
