# 해역별 낚시 배경

앱의 `/fishing/environments/`에서 직접 제공하는 배경 5장입니다. Supabase Storage 업로드나 SQL 적용은 필요 없습니다.

| 파일 | 수면 | 발판 |
| --- | --- | --- |
| pongdang.png | 맑은 푸른 물과 햇빛 | 밝은 꿀빛 나무 판자 |
| coral.png | 산호 그림자가 비치는 청록 물 | 산호와 따개비가 붙은 나무 |
| mistmoon.png | 은빛 달빛과 안개 | 젖은 짙은 나무 |
| starruins.png | 청금빛 물과 잠긴 유적 | 왕국 문양이 새겨진 석재 |
| dreamabyss.png | 짙은 남보라와 발광 흔적 | 빛나는 균열이 있는 검은 돌 |

생성 방식: 내장 image_gen. 각 파일은 1024×1536의 불투명 PNG이며, 전체 프롬프트는 [manifest.json](manifest.json)에 기록했습니다. 원본 그림에 개체·찌·낚싯대·문자는 포함하지 않았습니다.

`src/features/fishing/fishing-environment.tsx`가 이미지별 실제 경계를 기준으로 수면과 발판을 별도 SVG viewport에 표시합니다. 모바일과 컴퓨터에서 배경의 비율을 유지하고, 발판은 낚시터 하단에 고정합니다. 움직이는 물결·그림자·찌·낚싯대는 `fishing-water.tsx`가 위에 합성합니다. 이미지 로딩 실패 시 기존 수면 그라데이션과 지역별 발판 색을 사용합니다.

이미지를 교체하면 `waterEnd`와 `deckStart`를 실제 경계에 맞춰 함께 조정합니다. 수면의 중앙은 실루엣과 상태 문구를 읽을 수 있게 비워둡니다.
