# 미끼 전용 이미지

내장 `image_gen.imagegen`으로 투명 배경 아이콘을 생성했다. 기존 반달 꿀젤리 이미지를 채색·금속 재질 참고로 사용하며 최종 프롬프트와 원본 경로는 manifest에 보존한다. 원본 생성 파일을 유지하고 배치 안 PNG는 업로드 도구의 무손실 재압축 결과를 보존한다.

`npm.cmd run storage:upload -- assets/storage-upload/new/20261022-191208`로 collectibles 버킷에 업로드한다. 공개 파일 해시를 검증한 뒤 두 미끼의 image_path만 갱신한다. 로컬 카탈로그 경로는 CLI 생성 migration으로 기록한다. 같은 버전 경로를 덮어쓰지 않고 재제작 시 버전을 올린다.

업로드 후 `node artifacts/prepare-bait-art.mjs --finalize`로 최종 PNG 해시·크기를 manifest에 기록하고 public 사본을 맞춘다. `node artifacts/bait-art-remote.mjs apply assets/storage-upload/new/20261022-191208`는 대상 프로젝트와 기존 카탈로그 값을 확인하고 공개 파일 해시가 맞는 두 이미지 경로만 갱신·재조회한다. 로컬 migration은 DB 전체 이력 배포 여부와 별개로 재현용이며 원격 migration history를 변경하지 않는다.
