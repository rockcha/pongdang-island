> 과거 생성 기록입니다. 새 작업은 [현재 그림체 기준](../references/collectible-style/README.md)과 [방향 규칙](../references/collectible-style/artwork-facing.md)을 따릅니다.

# 일반 바다 어종 5종 업로드

내장 image_gen으로 기존 별꼬리 가오리 참고 이미지의 그림체를 맞췄습니다.
굵은 갈색 외곽선, 파스텔 음영, 반짝이는 눈과 볼터치를 사용합니다.
생성 프롬프트는 `common-ocean-fish-prompts.json`에 기록했습니다.

## 업로드 순서

1. Supabase Dashboard → Storage → 기존 공개 `collectibles` 버킷을 엽니다.
2. 아래 PNG 10장을 `fish/normal/` 폴더에 업로드합니다. `collectibles`는 버킷 이름이며 객체 경로에 다시 붙이지 않습니다.
3. 기존 SQL 16/17이 적용된 DB의 SQL Editor에서 `supabase/sql/18-common-ocean-fish/01-common-ocean-fish.sql`을 실행합니다.
4. SQL 마지막 조회에서 어종 5개와 각각 `coral`, `mistmoon`, `pongdang` 서식지가 나오는지 확인합니다.

| 이름 | 스프라이트 | 썸네일 | 판매가 |
| --- | --- | --- | --- |
| 은빛 멸치 | silver-anchovy_sprite.png | silver-anchovy_thumbnail.png | 20 |
| 줄무늬 고등어 | striped-mackerel_sprite.png | striped-mackerel_thumbnail.png | 40 |
| 통통 전갱이 | plump-horse-mackerel_sprite.png | plump-horse-mackerel_thumbnail.png | 35 |
| 모래 망둑어 | sand-goby_sprite.png | sand-goby_thumbnail.png | 25 |
| 동글 쥐치 | round-filefish_sprite.png | round-filefish_thumbnail.png | 30 |

스프라이트는 정사각형 투명 PNG의 2×2 4프레임입니다. 재생 순서는 왼쪽 위 → 오른쪽 위 → 왼쪽 아래 → 오른쪽 아래입니다.
썸네일은 같은 물고기 한 마리를 그린 별도 정사각형 투명 PNG입니다.
등급은 모두 `common`이며 기존 앱의 일반 이미지 폴더명 `normal`을 사용합니다.

SQL은 반복 실행할 수 있습니다. 신규 5종의 설정을 갱신하고 부족한 서식지 행을 추가합니다.
기존 보유 개체, 골드, 미끼, 어항 및 기존 어종은 보존합니다.
같은 등급의 후보가 늘어나므로 각 기존 일반 개체가 뽑힐 상대 비율은 낮아집니다.
원격 Storage 업로드와 DB 실행은 아직 수행하지 않았습니다.

공식 업로드 문서: https://supabase.com/docs/guides/storage/uploads/standard-uploads

## 로컬 검증

`node scripts/verify-common-ocean-fish.mjs`

PGlite에서 실제 기존 카탈로그 스키마에 SQL을 두 번 실행하여 제약조건, 중복 방지, 서식지 15행과 PNG 경로 10개를 확인합니다.
