> 과거 생성 기록입니다. 새 작업은 [현재 그림체 기준](../references/collectible-style/README.md)과 [방향 규칙](../references/collectible-style/artwork-facing.md)을 따릅니다.

# 희귀 상어·고래 5종

첨부 수달과 같은 갈색 외곽선·부드러운 음영·반짝이는 눈·볼터치 그림체로 내장 image_gen을 사용했습니다. 로컬 수달 이미지를 스타일 참조로 사용하며 동물의 종류는 상어·고래로 새로 그립니다.

## 적용 순서

1. 기존 collectibles 버킷의 **fish/rare/**에 아래 새 PNG 10장을 업로드합니다.
2. 16/17 스키마가 적용된 퐁당섬 프로젝트의 SQL Editor에서 `supabase/sql/21-rare-sharks-whales/01-rare-sharks-whales.sql`을 실행합니다.
3. 마지막 조회에서 희귀 5종과 각 서식지 5개를 확인합니다.
4. 앱 새로고침 후 아쿠아리움 테스트 어종 선택에서 넣어볼 수 있습니다.

| 이름 | 파일 접두사 | 표시 크기 | 속도 기준 | 판매가 |
| --- | --- | --- | --- | --- |
| 푸른 백상아리 | blue-great-white | 136px | 0.055 | 380 |
| 모래 귀상어 | sand-hammerhead | 128px | 0.050 | 340 |
| 별점 고래상어 | star-spotted-whale-shark | 160px | 0.035 | 480 |
| 밤빛 범고래 | night-orca | 148px | 0.045 | 450 |
| 구름 혹등고래 | cloud-humpback | 172px | 0.030 | 520 |

접두사마다 `_sprite.png`(정사각형 2×2 4프레임)와 `_thumbnail.png`(한 개체)의 투명 PNG 두 장이 있습니다. DB 경로는 버킷 이름을 제외한 `fish/rare/파일명.png`입니다.
작은 어항에서는 기존 앱 규칙에 따라 표시 크기가 어항 너비의 40% 이하로 제한됩니다.
높이 범위는 0.15~0.80이며 초기 5개 해역 모두에서 희귀 당첨 시 추첨 후보가 됩니다.
게임의 kind=fish는 어항에서 헤엄치는 개체 분류이므로 고래도 이 값을 사용합니다.
기존 일반 대형 5종은 일반 등급으로 유지하고 새 종류 ID만 추가합니다.
희귀 당첨 확률은 유지하며 같은 등급 후보가 늘어 기존 희귀 종류의 상대 추첨 비율은 낮아집니다.
SQL은 반복 실행할 수 있고 보유 개체·골드·미끼·어항을 보존합니다. 원격 DB와 Storage에 자동 적용하지 않았습니다.

프롬프트: `rare-sharks-whales-prompts.json`.
검증: `node scripts/verify-rare-sharks-whales.mjs`.
