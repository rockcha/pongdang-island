# 아난케 유영형 전신 교체

얼굴·왕관·행성 실 장식을 유지하고 허리 아래 몸과 옷자락이 뒤로 흐르도록 수정했다. 앞 4프레임은 머리·몸통을 고정한 천과 머리카락의 물결, 뒤 4프레임은 실을 당겨 행성을 들었다가 복귀하는 동작이다. 가이드는 배치만, 기존 썸네일은 동일성, 별빛 가오리는 채색·재질만 참고한다.

`manifest.json`에 입력 역할과 최종 시트 프롬프트를 보관했다. `sources/`는 생성 원본이며 `rejected-margin`은 여백 검사에서 제외한 시안이다. 채택 원본과 최종 시트는 각각 이미지 검사를 통과했다. 눈·얼굴의 불투명 패치 `[278,130,19,25]`를 직접 확인하고 등록했으며, 역방향 정수 이동을 최종 PNG에 반영했다. `final-registration.json`의 얼굴 위치 잔차는 전 프레임 `[0,0]`이다. 배율은 개체 전체에만 적용한다.

재검증:

```powershell
node scripts/audit-collectible-images.mjs assets/storage-upload/new/20261105-120500
node assets/storage-upload/new/20261105-120500/prepare.mjs --final
node scripts/audit-collectible-images.mjs assets/storage-upload/new/20261105-120500 --final
npx.cmd vitest run tests/mythic-swim.test.ts tests/inhabitant-motion.test.ts
node assets/storage-upload/new/20261105-120500/preview.mjs
```

`artifacts/ananke-swim-preview.html`에서 실제 프레임 선택·배율·6초 반복과 모션 감소를 확인한다. 밝은색·어두운색 접촉 시트와 실제 표시 크기 미리보기를 함께 사용한다. 썸네일은 기존 카탈로그 키의 번들 파생 이미지로 교체했고, 시트는 v2 public 파일에 연결했다. 원격 Storage 업로드나 DB 변경은 하지 않았다. 아포칼립시스 하단 고정은 별도 로컬 migration이므로 앱 푸시만으로 운영 DB에 적용되지 않는다.
