# 개체별 이동 방식

34 이후 [01-collectible-movement.sql](01-collectible-movement.sql)을 실행합니다. 기존 어종은 현재 좌우 유영·그림 반전을, 쓰레기는 기존 부유·회전을, 장식물은 고정 배치를 유지합니다. 보유 개체·위치·회전·크기는 변경하지 않습니다. 재실행해도 이미 설정한 이동 옵션을 보존합니다. 원격 DB 적용은 SQL Editor에서 수행합니다.

`collectible_species`에 다음 필드를 추가합니다. 기존 JSON 응답은 `to_jsonb(s)`를 사용하므로 별도 RPC 서명 변경 없이 전달됩니다.

| 필드 | 값 | 역할 |
| --- | --- | --- |
| movement_type | swim / pulse / crawl / fixed | 일반 유영 / 위로 추진 후 천천히 하강 / 일정 높이 좌우 이동 / 제자리 고정 |
| flip_with_direction | boolean | 왼쪽 진행 시 그림 좌우 반전 여부 |
| travel_direction | both / left / right | 왕복 / 왼쪽으로만 / 오른쪽으로만 이동 |

`swim`은 기존 유영 로직입니다. `pulse`는 개체마다 다른 느린 좌우 흐름을 따라 사선으로 이동하면서 얕은 범위를 천천히 오르내립니다. 높이 범위 전체를 빠르게 왕복하지 않으며, 몸의 회전 없이 방향을 부드럽게 바꿉니다. 박동 시트는 초당 1.6프레임으로 재생합니다. `crawl`은 높이 범위 중간 지점에서 좌우로 움직이며 기울거나 회전하지 않습니다. `fixed`는 저장한 위치에 고정하고 시트도 첫 프레임에 머뭅니다. 이 pulse 렌더링 변경에는 추가 SQL이 필요 없습니다.

`left`·`right`는 화면 밖까지 한 방향으로 이동한 뒤 반대편에서 들어옵니다. 크기는 그대로 유지하고 드래그한 위치에서도 같은 방향으로 계속 이동합니다. 속도는 기존 `speed`를 사용합니다. 장식물·지도는 종류에 따라 항상 고정되며 방향 설정을 적용하지 않습니다.

해파리·꽃게 같은 새 개체를 등록할 때 사용할 설정 예시입니다. 아래 ID는 예시이며 이 SQL은 새 개체를 추가하거나 임의의 기존 개체를 해파리·꽃게로 변경하지 않습니다.

```sql
-- 해파리: 그림 반전 없이 위아래 추진
update public.collectible_species
set movement_type='pulse',flip_with_direction=false,travel_direction='both',
    swim_y_min=.2,swim_y_max=.8,speed=.03
where id='example-jellyfish';

-- 정면 꽃게: 바닥에서 좌우 이동, 정면 그림 유지
update public.collectible_species
set movement_type='crawl',flip_with_direction=false,travel_direction='both',
    swim_y_min=.86,swim_y_max=.92,speed=.025
where id='example-crab';

-- 오른쪽으로만 유영하고 반대편에서 재진입
update public.collectible_species
set movement_type='swim',travel_direction='right',flip_with_direction=false
where id='example-one-way-fish';
```

어종·쓰레기의 기존 speed/높이 유효성 제약은 유지하므로 fixed 어종도 기존 양수 speed를 유지하고 렌더러에서만 이동을 멈춥니다. 새 장식물·지도는 fixed/반전 없음, 새 쓰레기는 반전 없음으로 초기화하며 실제 개체 종류가 바뀌면 해당 종류의 기본 이동으로 되돌립니다. 같은 종류의 재등록·마이그레이션 재실행은 사용자 설정을 유지합니다.

특수 이동 개체는 배경 탭 회피를 적용하지 않아 정면 방향·바닥 높이·한 방향 이동을 지킵니다. 드래그 위치는 저장하고 움직임 감소 설정에서는 모든 이동·시트 애니메이션을 정지합니다. 기존 필드가 없는 과거 선물 스냅샷은 이전 종류별 움직임을 기본값으로 사용합니다.

구현: `movement-settings.ts`(설정·그림 반전), `inhabitant-motion.ts`(좌표·방향·프레임), `phaser-tank.ts`(렌더링). 기존 어종 시트 구조는 2×2로 유지합니다.
