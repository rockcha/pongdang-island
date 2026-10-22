# 냠냠 한상바다 추가 3종

내장 `image_gen` 생성물입니다. [manifest](manifest.json)에 카탈로그·이동 설정·경로·최종 프롬프트를, [생성 입력 기록](generation-log.json)에 개체별 입력 역할과 원본 경로를 보존합니다. 일반은 저장소의 퐁이 카툰 참고, 특급은 별빛 가오리의 채색·조명·재질만 참고하며 개체별 해부 구조를 따릅니다.

새 어종은 오른쪽 원본이며 썸네일과 2×2 네 프레임 시트를 분리했습니다. 핫도그 정어리는 꼬리와 지느러미, 해물전골 아귀는 꼬리·국자 유인등·김, 천겹 크루아상 앵무조개는 촉수·깔때기의 수축과 이완을 움직입니다. 단단한 몸통·껍데기는 위치 등록의 기준입니다.

원본은 `sources/*.source`에 보존합니다. `prepare-nyamnyam-sprites.ps1 -Root <배치>`와 `inspect-nyamnyam-art.ps1 -Root <배치> -RequireComplete`로 원본 잘림·최종 여백을 검사하며, 프레임별 크기를 따로 바꾸지 않습니다. `register-sprite-anchors.ps1`의 측정값을 `register-nyamnyam-extras.mjs <배치>`로 앱에 연결합니다. `review.html`은 개발 서버에서 실제 어항 렌더러의 움직임을 확인하는 로컬 미리보기입니다.

카탈로그 배포는 CLI 새 migration 생성 후 세 ID만 지정한 `db:catalog`를 사용합니다. 어종 PNG 여섯 개는 `storage:upload`로 업로드하고 `verify-nyamnyam-upload.mjs <배치>`의 공개 다운로드 SHA-256 검사로 확인합니다. 앱 연결은 별도 커밋·배포가 필요합니다.
