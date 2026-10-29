# 경제 유물 이미지

정적 유물 아이콘이다. 원본과 등급별 스타일 참고·프롬프트는 manifest에 기록했고, 원본 PNG는 `assets/generated/economic-relics-20261030`에 보존한다. 어항에서 움직이는 개체로 등록하지 않는다.

`scripts/audit-collectible-images.mjs`로 원본과 런타임 PNG를 각각 검사한다. 접촉 시트는 업로드 대상 폴더 밖의 원본 보존 폴더에 둔다. 밝은색·어두운색 배경과 실제 카드 크기에서 윤곽을 확인한다.

프로젝트 루트에서 `npm.cmd run storage:upload -- assets/storage-upload/new/20261030-000506`로 업로드한다. 공개 PNG의 바이트 해시를 로컬 파일과 대조한 뒤 관련 카탈로그 migration을 적용한다. 교체 시 파일명 버전을 올리고 기존 경로를 덮어쓰지 않는다.
