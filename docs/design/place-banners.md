# 장소 풍경 배너

내장 `image_gen` 도구로 생성한 배경 이미지 7장을 `public/banners/`에서 제공합니다. Supabase Storage 업로드나 SQL 변경은 필요하지 않습니다. `PlaceBanner`가 헤더 바로 아래에서 경로별 이미지를 표시합니다. 높이는 120px, 왼쪽 아래에 제목과 한 줄 장소 설명을 흰색으로 함께 표시하며 본문의 제목·소개 문구는 제거합니다. 아쿠아리움에는 배너가 없습니다.

| 경로 | 제목 | 이미지 |
| --- | --- | --- |
| / | 퐁당 섬 | /banners/island.png |
| /harbor | 선착장 | /banners/harbor.png |
| /friends | 등대 | /banners/lighthouse.png |
| /notifications | 우편함 | /banners/mailbox.png |
| /square 및 /square/* | 광장 | /banners/square.png |
| /merchant-street 및 /merchant-street/* | 상인거리 | /banners/merchant-street.png |

## 생성 프롬프트

지역 낚시 화면의 해역 배너는 `src/features/regions/region-page.tsx`에서 별도로 표시합니다. 왼쪽 아래에 위치 핀(MapPin)·24px 중간 굵기 해역명·지역 설명을 표시합니다. 도구는 배너 아래 상단 중앙에 모읍니다. 5개 해역 모두 `/banners/{regionId}-horizon.png`를 사용합니다. 수평선은 이미지 맨 아래에 두고 전경 바다 대신 하늘·섬·해안 지형을 중심으로 구성합니다. 퐁당섬은 맑은 섬·등대, 산호빛 여울은 열대 절벽, 안개달은 달빛·안개, 별잠 유적은 별하늘·석조 유적, 꿈먹는 심연은 오로라·어두운 암벽입니다. 실제 낚시 수면·판자와 선착장 지도 이미지는 유지합니다. [5종 생성 프롬프트·참고 기록](../../assets/references/fishing-horizon-manifest.json). 세부 구성은 [낚시 화면 설계](fishing-minigame.md#화면과-조작)를 따릅니다.

### square.png

Create one wide panoramic landscape banner for the same cozy Korean island-life cartoon game: painterly polished anime background, soft rounded shapes, cream coastal cottages with coral tile roofs, pastel turquoise sea, warm gentle morning sunlight, lush coastal greenery and small white flowers. Match a peaceful sunlit Mediterranean-tropical island village. Horizontal 3:1 composition, full-bleed opaque image, no people, no text, lettering, readable signs, logo, collage, borders or watermark. Main landmark in center-right, lower left relatively quiet for UI title and subtitle. Readable after cropping to a 448 by 120px game page banner. A small village square right by the sea, warm pale stone paving with a subtle shell mosaic in its center, an old wooden community noticeboard with a few blank cream notices on the right, a low stone bench, flowering bushes, a few pastel houses framing the square, the turquoise bay visible beyond. Inviting gathering place, open composition, a hint of market stalls in the far background.

### merchant-street.png

Create one wide panoramic landscape banner for the same cozy Korean island-life cartoon game: painterly polished anime background, soft rounded shapes, cream coastal cottages with coral tile roofs, pastel turquoise sea, warm gentle morning sunlight, lush coastal greenery and small white flowers. Match a peaceful sunlit Mediterranean-tropical island village. Horizontal 3:1 composition, full-bleed opaque image, no people, no text, lettering, readable signs, logo, collage, borders or watermark. Main landmark in center-right, lower left relatively quiet for UI title and subtitle. Readable after cropping to a 448 by 120px game page banner. A charming small merchant street beside an island harbor. Cream wooden shopfronts and compact stalls with coral-and-ivory striped fabric awnings, woven baskets, ceramic jars and sea shell curios, a discreet tiny raised wooden auction platform and small gavel display among the stalls on the right, warm stone path leading towards turquoise sea and a little sailboat. Cozy lively trading quarter without any people, not a giant busy city market.

### island.png

Create a single wide panoramic landscape banner for a cozy Korean island-life cartoon game, stylized-concept illustration. Horizontal 3:1 composition. Soft painterly cartoon background with clean rounded shapes, subtle paper texture, pastel turquoise ocean, cream sand, muted coral roofs, warm gentle morning sunlight and pale blue sky. Charming inviting detailed scenery, no people or characters. Keep the main landmark in the center-right and the lower-left relatively quiet for a UI title overlay. Important landmarks remain visible within a central wide crop when used as a 448 by 120 pixel banner. Full-bleed opaque image, no frame, no collage, no text, letters, signs, logo or watermark. View across a sheltered bay toward a tiny lush island village with two little cream cottages with coral roofs, round palms, flowering coastal shrubs, a sandy path and calm sparkling water. Peaceful home island arrival scene.

### harbor.png

Create a single wide panoramic landscape banner for a cozy Korean island-life cartoon game, stylized-concept illustration. Horizontal 3:1 composition. Soft painterly cartoon background with clean rounded shapes, subtle paper texture, pastel turquoise ocean, cream sand, muted coral roofs, warm gentle morning sunlight and pale blue sky. Charming inviting detailed scenery, no people or characters. Keep the main landmark in the center-right and the lower-left relatively quiet for a UI title overlay. Important landmarks remain visible within a central wide crop when used as a 448 by 120 pixel banner. Full-bleed opaque image, no frame, no collage, no text, letters, signs, logo or watermark. A small wooden seaside pier stretching from sandy beach toward calm turquoise water, a little cream-and-teal fishing boat tied with rope to a mooring post, a coiled rope and weathered wooden planks, the same tiny pastel island village in the far background. Cozy harbor.

### shop.png

Create a single wide panoramic landscape banner for a cozy Korean island-life cartoon game, stylized-concept illustration. Horizontal 3:1 composition. Soft painterly cartoon background with clean rounded shapes, subtle paper texture, pastel turquoise ocean, cream sand, muted coral roofs, warm gentle morning sunlight and pale blue sky. Charming inviting detailed scenery, no people or characters. Keep the main landmark in the center-right and the lower-left relatively quiet for a UI title overlay. Important landmarks remain visible within a central wide crop when used as a 448 by 120 pixel banner. Full-bleed opaque image, no frame, no collage, no text, letters, signs, logo or watermark. A tiny welcoming beach shop built of cream painted wood, a coral-and-ivory striped fabric awning, small baskets of shells and glass fishing floats by an open window, lush green coastal plants and ocean beyond. No written sign. Cozy island general store.

### lighthouse.png

Create a single wide panoramic landscape banner for a cozy Korean island-life cartoon game, stylized-concept illustration. Horizontal 3:1 composition. Soft painterly cartoon background with clean rounded shapes, subtle paper texture, pastel turquoise ocean, cream sand, muted coral roofs, warm gentle morning sunlight and pale blue sky. Charming inviting detailed scenery, no people or characters. Keep the main landmark in the center-right and the lower-left relatively quiet for a UI title overlay. Important landmarks remain visible within a central wide crop when used as a 448 by 120 pixel banner. Full-bleed opaque image, no frame, no collage, no text, letters, signs, logo or watermark. A small white lighthouse with a muted coral red cap on a grassy rocky coastal headland, winding pale stone path with flowering shrubs, calm blue sea and a tiny offshore island. Friendly place to meet friends, sunny coastal landscape.

### mailbox.png

Create a single wide panoramic landscape banner for a cozy Korean island-life cartoon game, stylized-concept illustration. Horizontal 3:1 composition. Soft painterly cartoon background with clean rounded shapes, subtle paper texture, pastel turquoise ocean, cream sand, muted coral roofs, warm gentle morning sunlight and pale blue sky. Charming inviting detailed scenery, no people or characters. Keep the main landmark in the center-right and the lower-left relatively quiet for a UI title overlay. Important landmarks remain visible within a central wide crop when used as a 448 by 120 pixel banner. Full-bleed opaque image, no frame, no collage, no text, letters, signs, logo or watermark. A charming pale teal seaside mailbox on a short wooden post with one cream envelope peeking from the slot, beside a low weathered beach fence and flowering shrubs, sandy trail and soft turquoise sea behind. Warm inviting island post corner.


상점(`/shop`)은 `shop-interior.png`의 상점 내부 배너를 표시합니다. 이전 `shop.png`는 미사용 이미지로 보관합니다.

## 창고 배너

`/warehouse`는 `public/banners/warehouse.png`의 정돈된 해변 창고 내부를 사용합니다. Warehouse 아이콘과 24px 중간 굵기 제목, 짧은 부제는 공통 PlaceBanner에서 표시합니다. [생성 프롬프트](../../assets/references/warehouse-banner-manifest.json).
