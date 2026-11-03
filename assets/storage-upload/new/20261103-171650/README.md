# 농장 체험판 작물·건물 그림

작물 7종과 종자 상점·농작물 판매소·종자 연구소의 그림이다. 퐁이 참고는 따뜻한 색감과 갈색 윤곽선에만 사용하며 동물이나 소품 형태를 복제하지 않는다. 건물은 정사각형 타일에 맞는 위에서 내려다보는 구도와 서로 다른 기능적 실루엣을 유지한다.

정확한 생성 프롬프트·원본 위치·최종 해시는 `manifest.json`에 있다. `sources/*-thumbnail.source`는 생성 PNG 원본 바이트다. 아이콘은 256px, 건물은 512px 전체 캔버스 축소본으로 제공하며 여백·비율·알파를 보존한다. 저장소 루트에서 `node assets/storage-upload/new/20261103-171650/prepare.mjs`로 정적 배포용 `public/farm/art/v1/` 사본을 다시 만든다. 이 배치는 Supabase Storage나 운영 카탈로그를 변경하지 않는다.

원본과 최종본 각각 `scripts/audit-collectible-images.mjs`로 투명도·여백을 검사한다. 최종본 검사는 `--final`을 추가한다. 밝고 어두운 접촉 시트와 실제 모바일 표시 크기를 함께 확인한다. 관련 재배·연구·거래 규칙은 `tests/farm-simulation.test.ts`, UI 흐름은 `tests/farm-production-ui.test.tsx`에서 검증한다.

가격과 시간은 체험판 코드의 `crop-catalog.ts`가 원본이다. 실제 골드를 사용하거나 운영 경제 밸런스로 적용하는 설정이 아니다. 연구 완료는 창을 닫아도 진행되며, 구매 잠금과 파종 잠금이 함께 해제되어야 한다.
