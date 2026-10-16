# 푸른골 해역 이미지 세트

2026-10-17 KST에 built-in image_gen으로 제작한 일반 등급 해역 세트입니다. 현재 기준은 [에셋 안내](../../../README.md)와 [등급별 그림체](../../../references/collectible-style/README.md)를 따릅니다. 최종 프롬프트와 참고 역할은 [manifest.json](manifest.json)에 보관합니다.

## 구성

| 용도 | 저장 위치 | 제공 방식 |
| --- | --- | --- |
| 해역 지도 전경 | `assets/storage-upload/regions/bluegrove.png` | Storage `regions/bluegrove.png` |
| 낚시 배너 | `public/banners/bluegrove-horizon.png` | 앱 정적 파일 |
| 낚시 수면·발판 | `public/fishing/environments/bluegrove.png` | 앱 정적 파일 |
| 해역 아이콘 | `public/region-icons/bluegrove.svg` | 기존 SVG 체계로 작성 |
| 지도 조각 | `map/normal/map-bluegrove_thumbnail.png` | Storage `collectibles` |
| 낚싯대 썸네일·릴 테두리·회전판·찌 | `equipment/rods/bluegrove/` | Storage `collectibles` |

PNG 8종은 새로운 이미지이며 고운모래 만의 결과를 재사용하지 않았습니다. 지도 조각은 저장된 퐁이 이미지를 일반 등급 스타일 참고로 전달했고, 장비 부품은 새 낚싯대의 디자인을 참고했습니다. 글자·UI·잘림을 확인했으며 찌의 불필요한 그림자는 편집 생성으로 제거했습니다. 회전축은 테두리·회전판 각각 높이 49%, 찌 몸통은 51%로 표시 위치를 보정합니다. 낚시 그림은 1024×1536, 수면 끝 990px·발판 시작 1065px로 분리해 표시합니다.

## 적용과 검증

1. Storage 6개는 `.env.storage.local`의 대상 프로젝트에 업로드했습니다. 공개 URL 다운로드의 SHA-256을 로컬 원본과 대조했습니다. 대상 호스트·확인 시각은 manifest에 기록합니다.
2. [푸른골 등록 SQL](../../../../supabase/migrations/20261016155535_bluegrove_region_catalog.sql)을 기존 DB에 증분 적용합니다. **이 작업에서는 원격 DB에 실행하지 않았습니다.** 기존 RPC는 재정의하지 않습니다.
3. 앱을 배포하면 정적 배너·낚시 수면·아이콘도 제공됩니다. 선착장 목록, 지도 조각 잠금 해제, 출항, 상점 구매·장착을 확인합니다.

원격에서 `pongi-statue`가 퐁당섬 전용이라는 사용자 제공 오류를 반영해, SQL은 실행 대상 DB의 `native_region_id`를 조회하고 다른 해역 전용 개체를 서식지 추가 대상에서 제외합니다. 전용 설정이나 기존 서식지는 바꾸지 않습니다. 아래 58종은 로컬 기준이며 원격의 전용 설정에 따라 실제 추가 수는 줄어들 수 있습니다.

일반 해역이며 기존 공통 어종·장식물 58종과 지도 조각을 연결합니다. 전용 토착 어종은 추가하지 않았습니다. 전용 낚싯대는 1,500골드, 반값 판매이며 효과 수치는 기존 지역 장비와 동일합니다. 실제 확률 효과 적용 범위는 [장비 시스템](../../../../docs/systems/rod-inventory.md)을 따릅니다.

검증: `npm.cmd test -- tests/bluegrove-sql.test.ts tests/rod-image-assets.test.tsx tests/rod-skin-art.test.tsx tests/fishing-environment.test.tsx tests/region-map.test.tsx`.
