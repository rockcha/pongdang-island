# 요정 어항 배경

기본 제공 `image_gen`으로 제작한 요정 배경 파노라마입니다. 상점 상품과 가격의 원본은 `supabase/catalog/catalog.json`, 최종 프롬프트와 생성 원본·전송 파일·공개 검증 정보는 `manifest.json`을 기준으로 합니다.

27:16에 가까운 연속 파노라마이며 가운데와 중간 수심에 개체가 헤엄칠 여백을 두었습니다. 문구·UI·실제 어종은 이미지에 넣지 않았습니다. 생성 원본은 별도 보존하고, 전송 PNG는 픽셀·색상·알파를 보존하는 DEFLATE 재압축만 적용합니다.

업로드는 `node scripts/upload-aquarium-panoramas.mjs --manifest assets/storage-upload/new/20261030-033333/manifest.json`으로 수행합니다. 새 버전 경로에만 업로드하고 기존 배경을 덮어쓰지 않습니다. `node artifacts/deploy-fairy-aquarium-backgrounds.mjs apply`는 대상 프로젝트·기존 배경·구매 RPC·공개 파일을 다시 확인한 뒤 해당 catalog migration만 적용합니다. 기본 실행은 읽기 전용 검증입니다.

원격 등록 여부와 검증 시각은 manifest를 확인합니다. 상점 카탈로그·공개 이미지 배포와 클라이언트의 파노라마 매핑·경량 미리보기 배포는 별개입니다. 구매·소유권·적용 검증은 로컬 DB의 가상 계정으로 수행하며 실제 플레이어 골드를 사용하지 않습니다.
