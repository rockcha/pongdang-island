# 할로윈 어항 배경

기본 제공 `image_gen`으로 생성한 세 연속 파노라마입니다. 상품·가격의 원본은 `supabase/catalog/catalog.json`이며, 생성 원본·최종 프롬프트·전송 파일·공개 검증 정보는 `manifest.json`을 기준으로 합니다.

중앙과 중간 수심을 비우고 장식은 양옆과 낮은 바닥에 배치합니다. 유령 모양은 조명 소품이며 실제 생물·캐릭터·문구·UI를 배경에 넣지 않았습니다. 생성 원본을 별도 보존하고 전송 PNG는 픽셀·색상·알파를 보존하는 DEFLATE 재압축만 적용합니다.

업로드는 `node scripts/upload-aquarium-panoramas.mjs --manifest assets/storage-upload/new/20261030-034926/manifest.json`으로 수행합니다. 기존 배경을 덮어쓰지 않습니다. 원격 등록과 공개 파일 검증 시각은 manifest에서 확인하며 프런트엔드의 파노라마 매핑·경량 미리보기 배포와 구분합니다. 구매와 어항 적용은 로컬 가상 계정으로 검증합니다.

`node artifacts/deploy-halloween-aquarium-backgrounds.mjs apply`는 대상 프로젝트·기존 배경·구매 RPC·공개 파일을 재확인한 뒤 이 배치의 catalog migration만 적용합니다. `verify`는 원격 등록·기존 배경 보존·공개 파일 해시·로그인 역할 조회를 다시 확인합니다. 미리보기 검증은 `node artifacts/previews/verify-fairy-aquarium-shop.mjs --halloween`을 사용합니다.
