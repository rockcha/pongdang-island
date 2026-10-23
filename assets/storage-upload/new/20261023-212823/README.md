# 할로윈 개체 제작 배치

내장 `image_gen`으로 제작합니다. 개체 목록·가격·이동 유형·방향·참고 이미지·최종 프롬프트는 [manifest](manifest.json)를 기준으로 확인합니다. 스타일 입력은 일반·희귀의 카툰풍과 특급·신화의 판타지 일러스트풍으로 구분하고, 스프라이트에는 해당 개체 썸네일과 여백 가이드를 사용합니다.

`sources/*.source`는 생성 원본 PNG 바이트입니다. 수정 전 시안은 `.previous`로 보존하며, 원본 셀 경계에서 잘린 시트를 축소해 통과시키지 않습니다. `prepare-halloween-sprites.ps1`은 전체 시트에 동일한 배율만 적용합니다. `select-halloween-anchors.ps1`의 자동 후보는 `artifacts/previews/halloween/anchor-patches.png`에서 실제 불투명한 얼굴·몸통 패치인지 확인한 뒤 `register-sprite-anchors.ps1`로 측정합니다. 신화는 4열×2행, 나머지 어종은 2열×2행입니다.

신화 기준점 측정에는 `register-sprite-anchors.ps1 -Columns 4`를 반드시 지정합니다. 기본값 2로 측정한 결과는 신화의 8프레임 등록에 사용할 수 없습니다. 움직이는 증기·갈기 대신 고정된 얼굴을 선택한 두 종은 `anchor-overrides.json`에 보존합니다.

검수 순서는 원본·썸네일·방향 확인 → `inspect-halloween-art.ps1 -RequireComplete` → 전체 시트 여백 조정 → 기준점 후보 확인·등록 → 신화 호환 시트 내보내기 → 무손실 압축 → `register-halloween-catalog.mjs --prepare-runtime` → 어항·도감 미리보기 → 최종 카탈로그 등록입니다. 신화 호환 시트 내보내기는 `export-nyamnyam-compat.ps1 -Root`에 이 배치 경로를 명시하여 기존 배치를 건드리지 않습니다.

`review.html`은 실제 어항 렌더러를 사용합니다. `artifacts/verify-halloween-preview.mjs`로 데스크톱·모바일·6초 동작·모션 감소를 확인합니다. 로컬 미리보기 검증은 원격 앱 배포나 실제 플레이어 데이터 검증의 증거가 아닙니다.

카탈로그 원본 변경 후에는 CLI로 빈 migration을 만들고 `db:catalog`의 `--table collectible_species`와 이 배치의 개체 ID들로 생성 범위를 제한합니다. `db:context`, `db:verify`와 관련 테스트를 통과한 뒤 이미지 업로드·공개 다운로드 해시·원격 카탈로그와 이동 설정을 확인합니다. 원격 적용에는 baseline 전체 실행이나 이력 repair를 사용하지 않습니다.

모든 ID의 `halloween-` 접두사는 서버 이벤트 기간 제한과 도감 필터를 연결합니다. 기간 밖의 새 획득은 막되 보유 개체와 예약한 직접 낚시는 만료시키지 않습니다. 출시 시각은 manifest의 `releaseAt`과 출시 등록 원본에서 확인합니다.
