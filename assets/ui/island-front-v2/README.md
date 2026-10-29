# 섬 정면 아트

기존 `island-facilities-v1`의 따뜻한 윤곽선과 셀 채색을 유지하면서 오브젝트의 기본 시점을 정면으로 맞춘 원본입니다. 바닥은 배치에 맞는 평면 재질입니다. 개별 프롬프트와 참고 원본은 `manifest.json`에 있습니다. built-in `image_gen`으로 생성했습니다.

`npm run images:island`로 앱용 PNG와 이미지 manifest를 생성합니다. 콘텐츠 해시가 포함된 URL을 사용하므로 원본을 바꾼 뒤에는 반드시 재생성합니다. 기존 원본과 과거 해시 파일은 다른 배포에서 참조할 수 있으므로 자동 삭제하지 않습니다.

오브젝트에는 글자를 굽지 않습니다. 표지판 문구와 저장된 회전, 울타리 연결은 렌더러가 처리합니다. 변경 후 `tests/island-png-assets.test.tsx`와 `tests/my-island-*.test.tsx`를 검증하고, 밝은색·어두운색·섬 배경에서 실제 표시 크기를 확인합니다.
