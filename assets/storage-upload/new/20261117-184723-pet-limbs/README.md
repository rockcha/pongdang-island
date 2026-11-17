# 펫 사지 원화 보정

추가 앞발이 그려진 7종의 동작만 수정한다. 정상 대기 자세와 기존 얼굴·눈깜빡임 좌표를 보존하며, 들어 올린 앞발의 바닥 복사본을 제거한다. 기본 체형·종·등급·능력은 변경하지 않는다.

`manifest.json`에 imagegen 편집 프롬프트, 입력·출력 해시, 수정 프레임과 검수 기준을 기록한다. `sources/`는 편집 입력과 생성 원본이며 `pets/`는 앱에서 사용하는 최종 시트다. 기존 v1 PNG는 보존한다. 앱은 새 v2 public URL을 사용하므로 이전 브라우저·디코딩 캐시에 남은 시트를 재사용하지 않는다. 생성·사전 로딩·그리기는 같은 URL 선택 함수를 사용한다.

얼굴의 불투명 픽셀과 기존 발 지지선을 보존하는 조립 과정은 다음 명령으로 재현한다. 원화를 추가로 생성하거나 원격에 업로드하지 않는다.

```powershell
node scripts/prepare-pet-limb-fixes.mjs assets/storage-upload/new/20261117-184723-pet-limbs
npx vitest run tests/pet-limb-corrections.test.ts tests/pet-ground.test.ts tests/pet-sprite-transition.test.tsx
```

모든 수정 자세의 사지 수는 이미지로 검수한다. 자동 검사는 원화 해시·정상 프레임 보존·얼굴 픽셀·발 높이·투명 여백과 렌더링 전환을 검사하며, 해부 구조의 시각적 검수를 대신하지 않는다. 배포와 운영 Storage 반영은 별도 요청 전까지 하지 않는다.
