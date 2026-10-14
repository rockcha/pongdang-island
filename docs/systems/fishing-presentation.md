# 낚시 모달과 랜덤 연출

지역에서 낚시를 누르면 shadcn Dialog를 열고, 최소 약 3초 연출 후 서버 결과를 보여줍니다. 서버 요청은 모달이 열릴 때 한 번 전송합니다. 네트워크가 느리면 연출이 끝나도 결과가 올 때까지 기다립니다. 대기 중에는 배경 클릭·Escape·닫기로 모달을 닫을 수 없고, 결과/오류 후에는 닫을 수 있습니다. 상태 변경과 unmount 때 타이머를 정리합니다.

## 파일
- `src/features/fishing/fishing-presentation.ts`: 3종 장면, 6개 바닷속 TMI, 8개 실패 문구, FISHING_ANIMATION_MS=3000, 무작위 선택.
- `src/features/fishing/fishing-dialog.tsx`: 대기/결과/오류 모달, 지연 결과 표시, 재시도.
- `src/features/fishing/fishing-panel.tsx`: 기존 서버 낚시와 모달 연결. 낚시마다 presentation을 한 번 생성해 연출 중 값이 바뀌지 않음.
- `public/sprites/pongi-fishing-pier.png`: 부두에서 찌 바라보기.
- `public/sprites/pongi-fishing-float.png`: 튜브 위에서 낚시.
- `public/sprites/pongi-fishing-rock.png`: 바위에서 낚싯대 당기기.
- `src/index.css`: 2x2 스프라이트 4프레임 반복, 대기 점멸. 동작 줄이기 설정에서는 애니메이션 정지.

세 스프라이트는 같은 확률로 선택합니다. TMI와 실패 문구도 각 목록에서 독립적으로 뽑습니다. 실패 이유는 귀여운 연출용이며 서버 확률이나 실제 실패 원인을 표현하지 않습니다. 화면 오류를 낚시 실패로 처리하지 않습니다. 오류 후 결과 다시 확인은 기존 operation_id 재사용으로 중복 추첨/소모를 막습니다. 새 낚시/재시도는 새 presentation을 선택합니다.

TMI는 물고기 포획 확률과 무관한 실제 바다 상식입니다. 다음 공식 자료를 확인해 작성했습니다. 소스 URL은 각 항목에 함께 저장해 내용 확인이 쉽도록 했습니다.
- NOAA 산호: https://oceanservice.noaa.gov/facts/coral.html
- NOAA 해마: https://oceanservice.noaa.gov/facts/seahorse.html
- Monterey Bay Aquarium 해달: https://www.montereybayaquarium.org/animals-the-ocean/animals-a-to-z/sea-otter
- 해달의 돌 사용: https://www.montereybayaquarium.org/wallpaper/southern-sea-otter-enrichment-wallpaper

## 생성 프롬프트
built-in image_gen 사용. 기존 public/sprites/pongi-sailing.png를 퐁이 정체성과 화풍 참고로 사용했습니다. 공통: 갈색 해달·크림색 얼굴과 배·볼 홍조·주황 불가사리 머리핀, 투명 배경 2x2 네 프레임, 같은 카메라·크기·중심점, 낚싯대와 줄까지 각 셀 안쪽에 충분한 여백, 글자/배경/획득 물고기 없음. 각각 작은 부두에서 찌 관찰, 민트색 튜브에서 낚시, 바위 위에서 가벼운 입질에 낚싯대 당기는 자세.

## 적용/검증
SQL 변경과 Storage 업로드는 필요 없습니다. 기존 낚시 서버 함수·보상·미끼 소모 규칙은 동일합니다.
- `tests/fishing-dialog.test.tsx`: 3초 이전 결과 숨김, 완료 후 결과·실패 문구 표시, 서버 지연, 랜덤 선택 범위.
- `tests/fishing-panel.test.tsx`: 구매/결과/네트워크 재시도와 인벤토리.

위치 고정: 출항의 raft-bob 이동 애니메이션을 제거했습니다. 스프라이트는 제자리에서 4프레임만 전환합니다. 낚시 모달은 고정 높이와 헤더/버튼 영역을 확보해 TMI·결과 전환 때 이미지가 위아래로 밀리지 않도록 합니다.

## 프레임 내부 위치 보정
원본 시트가 1254×1254이며 각 셀은 627×627입니다. CSS 이동을 제거해도 아래쪽 두 프레임의 그림 자체가 위로 그려져 있었습니다. 알파/돌 픽셀을 읽어 기준점을 확인했습니다.

| 장면 | 원본 프레임별 바닥 y | 보정 후 바닥 y |
| --- | --- | --- |
| 바위 | 582, 583, 545, 545 | 모두 582 |
| 부두 | 564, 563, 524, 520 | 모두 564 |
| 튜브 | 587, 587, 546, 546 | 모두 587 |

fishing-dialog의 data-scene과 index.css의 장면별 keyframes가 background-position 샘플링 좌표를 조절합니다. 프레임별 하단 기준선과 좌측 기준점을 맞춰 시각적 위치를 고정하며 요소 자체에는 translate를 적용하지 않습니다. step-end로 프레임을 즉시 교체합니다. 결과 표시/동작 줄이기는 첫 프레임 좌표에 고정합니다. 이미지가 새로 생성되면 셀 크기와 기준점을 다시 측정해야 합니다. 원본이 프레임마다 다시 그려진 일러스트이므로 표면 윤곽의 작은 차이는 남아 있습니다.
