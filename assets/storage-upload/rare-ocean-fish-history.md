> 과거 생성 기록입니다. 새 작업은 [현재 그림체 기준](../references/collectible-style/README.md)과 [방향 규칙](../references/collectible-style/artwork-facing.md)을 따릅니다.

# 대형 일반 바다 어종 5종

기존 별꼬리 가오리를 그림체 참조로 내장 image_gen을 사용했습니다.
굵은 갈색 외곽선, 파스텔 음영, 반짝이는 눈과 볼터치를 유지합니다.
생성 프롬프트: `rare-ocean-fish-prompts.json`.

## 적용

1. `collectibles` 버킷의 `fish/rare/`에 아래 새 PNG 10장을 파일명 그대로 업로드합니다.
2. 기존 16/17 카탈로그 스키마가 적용된 퐁당섬 프로젝트에서 `supabase/sql/19-rare-ocean-fish/01-rare-ocean-fish.sql`을 실행합니다.
3. 마지막 조회에 일반 어종 5개와 각각 서식지 5개가 표시되는지 확인합니다.

| 이름 | 파일 접두사 | 표시 크기 | 판매가 |
| --- | --- | --- | --- |
| 푸른 돛새치 | blue-sailfish | 112px | 220 |
| 산호빛 참돔 | coral-seabream | 96px | 180 |
| 얼룩 왕그루퍼 | spotted-giant-grouper | 120px | 260 |
| 은빛 방어 | silver-yellowtail | 108px | 200 |
| 민트 만새기 | mint-mahi-mahi | 116px | 240 |

각 접두사 뒤에 `_sprite.png`, `_thumbnail.png` 두 파일이 있습니다.
스프라이트는 정사각형 투명 PNG의 2×2 4프레임이며, 썸네일은 한 마리만 그린 별도 정사각형 투명 PNG입니다.
표시 크기는 기존 앱의 정사각형 컨테이너 기준이며 작은 어항에서는 너비의 40%로 제한됩니다.

모두 `common` 등급으로 퐁당섬 앞바다·산호빛 여울·안개달 해역·별잠 유적·꿈먹는 심연에서 기존 일반 추첨의 후보가 됩니다.
왕그루퍼는 바닥 가까이, 나머지는 중상층에서 유영합니다.
일반 등급 당첨 확률은 그대로이며 기존 일반 어종의 상대 추첨 비율은 낮아집니다. 이미지 경로 fish/rare는 기존 업로드와의 호환을 위해 유지하며 실제 등급은 DB의 rarity로 결정됩니다. 이미 19를 적용했다면 20-large-fish-common/01-large-fish-common.sql만 실행하면 됩니다.
SQL은 반복 실행 가능하며 보유 개체·골드·미끼·어항을 보존합니다.
원격 Storage 업로드와 DB 실행은 수행하지 않았습니다.

로컬 검증: `node scripts/verify-rare-ocean-fish.mjs`.
