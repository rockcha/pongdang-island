# 구름나루 전용 개체 25종

요청 구성: 일반 9, 희귀 8, 특급 7, 신화 1. 생물 22종, 장식품 2종, 쓰레기 1종이다. 최종 PNG는 썸네일 25개와 생물 시트 22개, 총 47개다.

일반·희귀는 `assets/references/collectible-style/common-rare-pongi.png`, 특급·신화는 `epic-mythic-starlight.png`를 실제 스타일 참고로 전달했다. 구름나루의 지브리풍 요청을 유지하며 일반·희귀의 읽기 쉬운 비율과 윤곽, 특급·신화의 부드러운 판타지 명암을 적용했다. 스프라이트는 검수한 해당 개체의 썸네일을 동일성 참고로 사용했다. `manifest.json`에 선택된 원본 경로·실제 프롬프트·참고 이미지·해시를 기록한다. 생성 도구는 내장 `image_gen`이며 CLI/API 대체 도구는 사용하지 않았다.

## 동작

- 하울의 움직이는 성: `crawl`, 4×2 8프레임. 기계 다리와 매달린 부품이 움직이고, 6초마다 창문에 따뜻한 불빛이 흐른다. 몸통 배율·불투명도는 고정이며 회전 포즈 혼합은 없다.
- 별사탕 검댕이·목욕표 개구리·고양이버스: `crawl`.
- 조개집 검댕이·찻잔 검댕이·코다마·장작 위 캘시퍼·화덕 캘시퍼·산·등불 가오나시·구름우산 토토로·오물신: `fixed` 생물. 네 프레임에서 단단한 몸통과 받침대는 유지하고 팔·천·불꽃·잎 등을 움직인다.
- 구름솜 해파리: `pulse`. 포뇨 두 종류·키키·흰 늑대·종이 식신·하쿠·구름배 가오나시·파도 포뇨: `swim`.
- 초록 양동이와 약병 상자는 정적 장식품, 토토로 우산은 정적 일반 쓰레기다.

## 검수와 재현

1. 썸네일 및 시트의 오른쪽 방향을 접촉 시트에서 검토한다. 경계 침범은 원본을 재생성한다. 가로로 긴 일부 개체는 직접 정렬한 배치 가이드를 이미지 편집 입력으로 사용했다.
2. `artifacts/select-cloudferry-assets.mjs`로 최종 생성 원본을 동기화한다.
3. 원본 알파 검사 후 `normalize-cloudferry-framing.ps1`로 모든 프레임의 합집합에 동일 배율과 동일 이동을 적용한다. 프레임별 자동 확대·자르기·재중앙 정렬은 하지 않는다. `uniform-framing.json`에 변환을 기록한다. 이는 여백 정리이며 원본 디테일 복원 작업이 아니다.
4. `audit-cloudferry-assets.ps1`로 알파 16 이상 픽셀의 셀 경계를 검사한다. `register-cloudferry-bodies.ps1`은 머리·몸통 또는 고정 받침대의 이동만 측정한다.
5. `finalize-cloudferry-assets.mjs`가 manifest·앱 위치 보정·하울의 성 8프레임 파일을 연결한다.
6. `artifacts/cloudferry-expansion-preview.html`에서 제자리 반복과 정지 프레임을 확인한다. 로컬 검수는 실제 모바일 기기의 재생·DPR 검증을 대신하지 않는다.

## 업로드와 등록

```powershell
npm.cmd run storage:upload -- assets/storage-upload/new/20261017-175022
node artifacts/verify-cloudferry-upload.mjs
```

버킷은 `collectibles`; 이 폴더 안의 `fish/`, `trash/`, `decorations/`부터 경로를 사용한다. 문서·manifest는 업로드하지 않는다. 공개 파일 해시 검증 후 `register-cloudferry-species-remote.mjs`는 신규 카탈로그 행과 구름나루 서식지만 등록한다. 기존 종·플레이어·지갑은 변경하지 않는다.

로컬 CLI migration은 `20261017085502_cloudferry_native_species.sql`, 별도 설치 SQL은 `artifacts/cloudferry-species-install.sql`이다. 카탈로그 API 반영과 migration history 반영은 별개이며, `remote-registration.json`도 전체 원격 스키마 일치 증거가 아니다.

Completion evidence: upload-verification.json confirms all 47 public PNG SHA256 hashes; remote-registration.json confirms 25 species and 25 exclusive habitats. Related tests: 53 passed; app build passed. db:verify remains blocked by the existing frozen legacy SQL manifest mismatch (01-38 versus 39-62). App deployment is separate.
