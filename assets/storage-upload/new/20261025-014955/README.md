# 어항 파노라마

기존 테마의 분위기를 보존하면서 화면 세 배 너비의 연속된 풍경을 보여준다. 화면은 칸에 맞춰 멈추지 않고 원하는 위치까지 연속해서 이동한다. 배경 속 소품은 전체에 분산하되 물고기가 헤엄치는 중간 수심의 여백을 확보한다. 사용자 소유 개체의 저장 좌표와 배경 그림 속 소품은 별개다.

장식의 정규화된 가로 좌표는 어항 전체 너비를 기준으로 한다. 화면 가장자리에서 드래그하면 카메라가 이동하며, 놓은 지점을 같은 좌표로 저장한다. 기존 저장 값을 임의 변환하지 않으므로 종전에 중앙 구간에 배치했던 장식은 넓은 어항에 맞춰 다시 조정할 수 있다. 회전·크기 변경도 같은 전체 너비의 기하 계산을 사용해야 한다.

생성 도구는 기본 제공 `image_gen`이며 테마별 원본, 최종 프롬프트, 결과 경로와 해시는 `manifest.json`을 기준으로 확인한다. 원본 이미지는 보존한다. 앱의 로컬 매핑은 이 manifest의 원본 경로와 결과 경로에서 파생한 `src/features/aquarium/theme-panoramas.json`이다.

개발 모드는 이 폴더의 파일을 사용하고 운영 모드는 `aquarium-backgrounds` 버킷의 버전 파일을 사용한다. 원격 카탈로그의 테마 ID와 원본 경로는 바꾸지 않는다. `/aquarium-lab`에서 테마와 세 구간을 확인하고, `/artifacts/previews/aquarium-theme-gallery.html`에서 원본과 비교한다. 실제 꾸미기 조작은 `/artifacts/previews/aquarium-default-integration.html`에서 확인한다. 검증 명령은 `node artifacts/previews/verify-theme-panoramas.mjs`, `node artifacts/previews/verify-default-panorama-integration.mjs`다.

업로드는 `node scripts/upload-aquarium-panoramas.mjs`로 수행한다. 기존 파일을 덮어쓰지 않으며 PNG 픽셀을 보존하는 재압축 뒤 공개 다운로드 해시를 검증한다. 생성 원본은 manifest의 별도 출처에서 보존한다. 앱 연결을 배포하기 전에 모든 파일의 원격 검증을 마친다. 이미지 업로드와 프런트엔드 배포는 별개이며 로컬 검증을 운영 적용의 증거로 해석하지 않는다.
