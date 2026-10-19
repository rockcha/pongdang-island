# 어선 이미지

내장 imagegen으로 생성한 어선 그림의 512px 표시용 PNG입니다. 원본은 `assets/vessels/source/`, 최종 프롬프트·경로·SHA-256은 manifest를 기준으로 합니다.

업로드: `npm run storage:upload -- assets/storage-upload/new/20261018-234954`

collectibles 버킷의 `vessels/`에 제공하며, 공개 URL 다운로드가 로컬 해시와 일치하는지 확인한 뒤 앱의 public 중복본을 제거합니다. 새 이미지는 새 경로를 사용하고, 기존 그림 교체는 덮어쓰기와 캐시 갱신을 함께 검토합니다.
