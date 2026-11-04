# 특급 공통종 고래 이미지

사용자 요청에 따라 사실적인 표현을 줄이고 저장된 특급·신화 참고의 부드러운 판타지 채색, 둥근 표정, 은은한 빛을 사용한다. 참고는 `assets/references/collectible-style/epic-mythic-starlight.png`이며, 고래의 머리·몸통·꼬리 구조는 유지한다. 최종 생성·정리·스프라이트 프롬프트와 종별 설정은 `manifest.json`이 원본이다.

`sources/*.source`는 확장자만 바꾼 원본 PNG이며 썸네일, 생성 시트와 배치 가이드를 보존한다. `prepare-art.mjs`는 원본 시트의 머리 패치 정합 결과를 역이동하여 최종 PNG에 반영한다. 프레임별 확대나 실루엣 재중앙화는 하지 않는다. 모든 알파 픽셀을 보존하기 위해 네 프레임에 동일한 32px 투명 여백을 추가했다. 이 때문에 그림 점유율은 목표보다 조금 작지만, 꼬리 동작과 희미한 가장자리를 보존하는 것을 우선했다. `size`를 패딩에 비례해 인상하지 않았다.

머리 패치의 불투명 표본을 확인했고 `register-sprite-anchors.ps1 -Exact`로 원본과 최종본을 측정했다. `alignment.json`에 이동·경계·불투명 표본을, `final-registration.json`에 최종 잔여 이동을 남긴다. 밝은색·어두운색 배경의 전체 프레임은 `review/frames-*.png`, 실제 기본 표시 크기의 제자리 재생은 `preview.html`에서 확인한다. 실제 게임 어항·도감과 기기 DPR별 반복 재생 검수는 원격 등록 후 필요하다. 로컬 프레임 이미지 검수와 실제 게임 검수를 동일하게 취급하지 않는다.

최종 PNG는 Storage 업로더의 무손실 압축 결과와 동일한 바이트이며 `manifest.json`에 SHA-256을 기록했다. 공개 URL 8개를 내려받아 해시 일치를 확인했다. `npm run db:verify`와 최종 이미지 알파·여백 검사도 통과했다.

대상 프로젝트는 manifest에 명시한다. 관련 원격 카탈로그는 읽기 전용으로 확인했으나 관리 API가 HTTP 401을 반환하여 migration은 원격 미적용 상태다. 전체 원격 구조 호환성을 확인한 기록이 아니다. `20261104052124_four_shared_epic_fantasy_whales.sql`은 네 종과 해당 서식지만 변경하는 CLI 생성 migration이다. 인증을 복구한 뒤 DB 관리 절차에 따라 적용하고 종·가격·이동·서식지를 다시 조회한다. 실제 출시 시각은 그때 `src/features/regions/species-releases.json`에 등록한다.

재검증은 저장소 루트에서 실행한다.

```powershell
node scripts/audit-collectible-images.mjs assets/storage-upload/new/20261104-141330 --final
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/register-sprite-anchors.ps1 -Config assets/storage-upload/new/20261104-141330/final-anchor-config.json -Output assets/storage-upload/new/20261104-141330/final-registration.json -SearchRange 60 -Exact
node scripts/verify-collectible-batch.mjs assets/storage-upload/new/20261104-141330
npm.cmd run db:verify
```

공개 파일 검증 명령은 원격 카탈로그도 함께 비교하므로, migration 미적용 동안 종 누락으로 실패하는 것이 현재 기대 결과다.
