# 콩나무·역방향 폭포 애니메이션

사용자 요청으로 두 장식품을 특급으로 변경하고 가격을 낮춥니다. 현재 값의 원본은 `supabase/catalog/catalog.json`, 변경 파일은 `supabase/migrations/20261021033316_animate_and_regrade_shared_decorations.sql`입니다. 이전 신화 이미지·migration은 이력으로 보존하며 덮어쓰지 않습니다. 이번 썸네일·시트는 새 특급 경로를 사용합니다.

기존 승인 썸네일을 동일 개체 참고로 사용해 2×2 네 프레임을 제작했습니다. 콩나무는 덩굴·잎·이슬, 폭포는 위로 오르는 물줄기·거품과 바닥 파문이 움직입니다. 시트 전체를 같은 배율로 정규화하고 밑동·바위의 고정 패치를 등록했습니다. `manifest.json`에 실제 프롬프트, 원본 경로와 최종 해시를 보존합니다.

`shared-decoration-animation.ts`를 어항과 도감 미리보기가 함께 사용합니다. 모션 감소 또는 어항 편집 중에는 첫 프레임을 유지합니다. 그림 전체의 배율·불투명도 변화로 움직임을 대신하지 않습니다. 등급·이미지 변경으로 최초 출시 시각을 다시 등록하지 않습니다.

정규화는 `scripts/prepare-collectible-batch.ps1`, 위치 보정 검증은 `scripts/register-sprite-anchors.ps1`을 사용하며 이 폴더의 패치 설정을 입력합니다. 업로드는 `npm.cmd run storage:upload -- assets/storage-upload/new/20261021-123316 --dry-run`으로 경로를 확인한 뒤 같은 명령에서 `--dry-run`을 빼고 실행합니다.

검증: `tests/shared-decoration-animation.test.ts`, `tests/new-pongdang-species.test.tsx`, 타입 검사, `npm.cmd run db:verify`. Storage 업로드와 DB migration·앱 배포 완료는 별도이며, 원격 적용 후 두 종의 등급·가격·시트 경로와 공개 이미지 해시를 다시 확인합니다.
