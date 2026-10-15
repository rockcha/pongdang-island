# 바다악어 v2

내장 image_gen 도구로 퐁이 카툰풍 참고를 전달해 재설계했습니다. 기존 꼬리를 둥글게 말아 올린 왼쪽 원본 대신, 오른쪽을 향하고 몸과 꼬리를 길게 편 형태입니다. 썸네일과 2×2 스프라이트 PNG를 제공합니다.

## 파일과 적용

- `fish/rare/sea-crocodile-v2_thumbnail.png`
- `fish/rare/sea-crocodile-v2_sprite.png`

collectibles 버킷에 동일한 상대 경로로 업로드한 뒤 `supabase/sql/48-sea-crocodile-refresh/01-sea-crocodile-refresh.sql`을 실행합니다. 기존 이미지·소유 개체·등급·가치·서식지는 보존합니다. v2 파일명을 사용해 이전 캐시와 구분합니다.

```powershell
npm.cmd run storage:upload -- assets/storage-upload/new/20261015-191500
```

## 검수

시트는 1254×1254 RGBA, 셀은 627×627입니다. 네 프레임은 모두 오른쪽을 향하며 꼬리와 다리의 작은 동작으로 추진합니다. 전체 폭 점유율은 기존 55~58%에서 77.35~79.27%로 증가했습니다. 목표 80~88%에 약간 못 미치지만 전신·꼬리 동작과 안전 여백을 보존하는 이번 교체본의 예외로 기록합니다. 프레임별 독립 확대는 하지 않았습니다.

생성된 원본에도 아래 행의 머리 위치가 약 42px 높아지는 오차가 남아 `frame-registration.json`의 측정값을 `swim-frame-layout.ts`에 적용했습니다. 코끝 x와 머리 알파 중심 y를 기준으로 정렬하고 배율은 1로 유지합니다. 투명 경계·중앙 분할선과 실제 화면 배율의 좌표 보정을 검사합니다. 물리적인 모바일 기기에서의 육안 재생 검수는 별도입니다.

최종 프롬프트와 재작업 과정은 `manifest.json`, 알파 측정은 `alpha-report.json`에 기록합니다. 배경이 들어가거나 경계 여백이 부족했던 중간 생성본은 업로드 대상이 아닙니다.
