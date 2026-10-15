# 공통 확인 모달

앞으로 “~~하겠습니까?” 형태의 확인은 `src/components/confirm-dialog.tsx`의 `ConfirmDialog`를 재사용합니다. 실제 작업은 **확인**을 눌렀을 때만 실행하며, 성공한 뒤 호출 화면에서 모달을 닫습니다.

## 고정 디자인

- 공통 이미지: `public/branding/pongi-curious.png` → `/branding/pongi-curious.png`. 참고 퐁이의 갈색 털·크림색 배·분홍 불가사리를 유지한 궁금한 표정입니다.
- 너비 최대 320px, 작은 화면에서는 좌우 16px 여백. 둥근 모서리 24px, 안쪽 여백 24px, 얇은 테두리와 작은 그림자.
- 위에서부터 112px 퐁이 이미지 → 질문 → 보조 설명 → 버튼. 텍스트는 가운데 정렬합니다. 색종이·배지·큰 경고 아이콘은 넣지 않습니다.
- 제목: 구체적인 행동을 적은 “~~하겠습니까?” 한 문장. 예: “새 어항을 구매하겠습니까?”
- 보조 설명: 비용·변경되는 상태·유지되는 내용을 짧고 친근하게 적습니다. 예: “200골드가 사용돼요. 새 어항에서 바다 친구들을 꾸밀 수 있어요.”
- 버튼은 항상 왼쪽 **취소**, 오른쪽 **확인**. 같은 폭, 최소 높이 44px. 취소는 옅은 배경, 확인은 공통 primary 색상입니다. 별도 X 버튼은 없습니다.
- 처음 열릴 때 취소에 포커스합니다. 처리 중에는 버튼과 닫기를 막고 확인 버튼에 “처리 중…”을 표시합니다. 실패하면 모달 안에서 오류를 설명하고 다시 시도할 수 있게 합니다.
- 수량처럼 결정에 필요한 추가 입력만 `children`으로 설명과 버튼 사이에 넣습니다. 불필요한 상세 정보는 추가하지 않습니다.

## 사용 예

```tsx
import { ConfirmDialog } from '@/components/confirm-dialog'

<ConfirmDialog
  open={open}
  onOpenChange={setOpen}
  title="새 어항을 구매하겠습니까?"
  description="200골드가 사용돼요. 새로운 어항이 추가돼요."
  busy={busy}
  error={error}
  confirmDisabled={gold < 200}
  onConfirm={() => void purchase()}
/>
```

`purchase`에서 중복 실행을 막고, 작업 중 `busy`를 켜며 실패는 `error`에 표시합니다. 성공했을 때 `setOpen(false)`를 호출합니다. 모달 자체가 작업을 수행하거나 성공 여부를 추측해 닫지 않습니다. `trigger`에 Button 요소를 전달하면 해당 버튼으로 모달을 열 수도 있습니다.

현재 적용: 어항 구매, 어항 개체 판매(수량 입력 포함), 친구 끊기. 새 확인 창도 이 컴포넌트로 추가합니다. SQL 변경은 없습니다.

## 이미지 생성 기록

내장 `image_gen` 사용, 사용자 첨부 퐁이 이미지를 캐릭터 참고로 사용했고 `transparent_background=true`로 생성했습니다. 프로젝트에 최종 PNG를 복사했으며 기존 퐁이 이미지는 보존했습니다.

프롬프트:

Use the most recent attached user image as the character identity reference. Create one transparent PNG mascot asset for a minimal confirmation dialog in the same cozy game. Preserve Pongi exactly: adorable fluffy warm honey-brown baby otter, cream muzzle and belly, round ears, large glossy dark brown eyes with white catchlights, pink cheeks, thin white whiskers, dark brown outlines and the salmon pink starfish hair accessory on the upper right side of its head as seen by viewer. New pose: seated with a small curious head tilt, one little paw resting under the chin, other paw relaxed by the belly; slightly raised eyebrows, gentle inquisitive expression, closed sweet smile. Whole character visible, centered square composition, compact readable silhouette at 100px. Same polished softly shaded cartoon illustration as reference. Remove fishing line and hook, no rod, no background, no floor, no cast shadow, no text, no question mark or speech bubble, no surrounding props. Genuine transparent background, clean edges with generous transparent padding around the whole body.

