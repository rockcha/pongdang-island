# 이미지 생성·업로드 폴더 규칙

특정 배치의 생성·업로드 내역은 [과거 기록 목차](history.md)에서 필요한 기록만 확인합니다.

앞으로 생성하는 collectibles용 이미지는 **`assets/storage-upload/new/생성시간/` 아래에 버킷 내부 경로 그대로** 저장합니다. 기존 파일은 소급 이동하지 않습니다.

생성시간은 **한국 시간(Asia/Seoul), `YYYYMMDD-HHmmss`** 형식입니다. 한 생성 작업은 같은 폴더에 모으며 이름이 겹치면 `-02`처럼 구분합니다.

```text
assets/storage-upload/new/20261015-113000/
├── fish/
│   ├── rare/
│   │   ├── example-fish_thumbnail.png
│   │   └── example-fish_sprite.png
│   └── epic/
│       ├── example-diver_thumbnail.png
│       └── example-diver_sprite.png
├── trash/
│   └── normal/
│       └── example-trash_thumbnail.png
├── decorations/
│   └── rare/
│       └── example-decoration_thumbnail.png
├── map/
│   └── epic/
│       └── example-map_thumbnail.png
├── README.md
└── manifest.json
```

## 저장 규칙

그림체는 [등급별 실제 참고 이미지와 생성 기준](../references/collectible-style/README.md)을 따릅니다. **일반·희귀는 퐁이 카툰풍, 특급·신화는 별빛 가오리 참고의 부드러운 판타지 일러스트풍**입니다. 생성 전에 등급에 맞는 저장된 PNG를 확인하고 도구에 스타일 참고로 전달합니다. 스프라이트는 승인한 썸네일을 개체 동일성 참고로 사용합니다.

- 생성시간 폴더 안에 `collectibles/`를 더 만들지 않습니다. `fish/`, `trash/`, `decorations/`, `map/`부터 배치합니다.
- 등급 폴더는 일반 `normal`, 희귀 `rare`, 특급 `epic`, 신화 `mythic`입니다. DB 일반 등급 값 `common`과 폴더명 `normal`을 구분합니다.
- 실제 이미지가 들어가는 폴더만 만듭니다. 생성 단계에서 분류해 사용자가 다시 정리하지 않도록 합니다.
- 파일명은 `개체-id_thumbnail.png`, 유영 시트는 `개체-id_sprite.png`입니다. 교체 파일명을 바꾸면 SQL과 manifest에도 반영합니다.
- SQL 이미지 경로와 manifest의 `storage_path`는 생성시간 폴더 아래 상대 경로와 일치시킵니다. 예: `fish/epic/example-diver_sprite.png`.
- 생성 도구·최종 프롬프트·로컬 상대 경로·버킷 경로는 해당 폴더의 `manifest.json`에, 업로드 순서·적용 SQL은 `README.md`에 기록합니다.
- 지역 아이콘·배너처럼 `public/`에서 관리하는 이미지는 기존 public 경로를 유지합니다. 이 규칙은 collectibles 버킷 업로드용 생성 이미지에 적용합니다.

## 업로드 기준

### 이미지 캐시와 교체

공개 게임 이미지는 앱의 제한된 런타임 캐시에서 재사용한다. 실패 응답과 사용자 아바타·인증·RPC·서명 URL·음원은 이 캐시에 넣지 않는다. 실제로 본 이미지만 저장하며 오래 쓰지 않은 파일은 자동 정리한다. 앱 업데이트를 설치한 뒤부터 적용되고 브라우저의 사이트 데이터 삭제·공간 정리로 캐시가 사라지면 다시 다운로드한다.

교체 이미지는 기존 경로 덮어쓰기보다 파일명 버전을 올려 새 URL을 연결한다. 업로드 도구는 버전이 있는 PNG를 긴 브라우저 TTL로 제공하므로 같은 버전 경로를 재사용하지 않는다. 기존 무버전 파일의 TTL은 짧게 유지한다. 업로드 전에 PNG의 색상·알파·픽셀을 바꾸지 않는 DEFLATE 재압축을 수행하고, 전송한 바이트를 로컬에도 저장해 해시 검증을 가능하게 한다. 원본은 별도 생성 기록으로 보존한다.

어선 그림도 같은 업로드 도구를 사용하며 collectibles 버킷의 `vessels/{id}.png`에 저장합니다. 배치 폴더에 `vessels/`와 manifest를 두고 공개 다운로드의 해시를 확인합니다. 앱은 Storage 공개 URL을 사용하고, 원본 생성 PNG는 별도 재현 자료로 유지합니다.

### 명령어로 일괄 업로드

프로젝트 루트에 `.env.storage.local`을 만들고 아래 값을 설정합니다. 이 파일은 Git에서 제외되며 브라우저용 `VITE_` 변수로 만들지 않습니다. Supabase 프로젝트의 서버용 secret key 또는 기존 service_role 키를 사용합니다.

```dotenv
SUPABASE_URL=https://프로젝트ID.supabase.co
SUPABASE_SECRET_KEY=서버용키
```

```powershell
npm.cmd run storage:upload -- assets/storage-upload/new/20261015-114904 --dry-run
npm.cmd run storage:upload -- assets/storage-upload/new/20261015-114904
```

생성 폴더 기준 상대 경로로 collectibles 버킷에 PNG만 업로드합니다. README·manifest는 제외하며 같은 경로의 기존 파일은 건너뜁니다. 교체하려는 경우에만 `--overwrite`를 붙입니다. 중간 실패 시 이미 올라간 파일은 유지되므로 수정 후 재실행할 수 있습니다.

Dashboard에서는 같은 이름의 폴더가 자동 병합된다고 가정하지 않습니다. 수동 업로드는 기존 `fish/normal` 또는 `fish/rare`를 열고 해당 PNG 파일만 올립니다. `(1).fish`는 SQL이 참조하는 `fish`와 다른 경로입니다.

collectibles 버킷 루트에 생성시간 폴더 **안의 종류 폴더**를 올릴 수 있도록 준비합니다. `new`, 생성시간 폴더, `collectibles` 폴더 자체는 버킷 경로에 포함하지 않습니다. `README.md`와 `manifest.json`은 업로드하지 않습니다.

| 로컬 경로 | collectibles 버킷 내 대상 경로 |
| --- | --- |
| new/20261015-113000/fish/epic/example-diver_sprite.png | fish/epic/example-diver_sprite.png |
| new/20261015-113000/decorations/rare/example-decoration_thumbnail.png | decorations/rare/example-decoration_thumbnail.png |

트리는 형식 예시입니다. 빈 샘플 이미지나 생성시간 폴더를 미리 만들지 않습니다. 업로드할 때 최종 경로가 위 상대 경로와 같은지 확인합니다.

## 낚싯대 장비 이미지

`equipment/rods/{folder}/{thumbnail|reel-frame|reel-rotor|float}.png`도 업로드 도구에서 지원합니다. 기본 지급 입문용의 이미지 폴더는 `starter`이며 나머지는 낚싯대 ID와 같습니다. [현재 릴·찌 생성 기록](new/20261016-155626/README.md)을 참고하세요.
