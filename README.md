# DB 관리 안내

DB 구조·변경·원격 상태 확인은 [DB 관리](docs/systems/database-management.md)와 [생성된 현재 구조](docs/db/CONTEXT.md)를 기준으로 합니다. 기능 문서의 SQL 번호별 설명은 과거 구현 기록입니다.

# 퐁당섬

React · TypeScript · Vite로 만드는 모바일 낚시 게임 PWA입니다. Supabase 인증·게임 데이터·Storage를 사용하며 낚시, 지역 이동, 수족관, 도감, 친구·우편함 기능이 있습니다.

## 시작

```bash
npm ci
npm run dev
```

새로 pull한 뒤 의존성이 변경됐으면 `npm ci`로 맞춥니다. 서버가 파일을 사용해 설치가 막히면 개발 서버를 종료한 뒤 설치하고 다시 실행합니다.

프로젝트 루트에 `.env`를 만들고 다음 값을 입력합니다. 실제 값은 Git에 올리지 않습니다.

```dotenv
VITE_SUPABASE_URL=https://PROJECT_ID.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

환경변수를 바꾸면 개발 서버를 재시작합니다. Storage 일괄 업로드의 서버용 키는 별도 `.env.storage.local`에 설정합니다. [업로드 설정](assets/storage-upload/README.md).

## 문서 읽기

| 목적 | 시작 문서 |
| --- | --- |
| 작업 규칙과 읽는 순서 | [AGENTS.md](AGENTS.md) |
| 기능별 문서 찾기 | [개발 문서 목차](docs/README.md) |
| 코드 위치 찾기 | [시스템 지도](docs/system-map.md) |
| UI 수정 | [공통 UI 규칙](docs/ui-conventions.md) |
| 이미지 생성·관리 | [에셋 안내](assets/README.md) |
| DB 구조·변경·원격 확인 | [DB 관리](docs/systems/database-management.md) |
| 인증·비밀번호 복구 설정 | [인증과 계정](docs/systems/auth.md) |

## 검증과 실행 환경

```bash
npm test
npm run build
npm run preview
```

관련 변경은 해당 테스트부터 확인합니다. 같은 Wi-Fi의 휴대폰으로 확인하려면 `npm run dev -- --host 0.0.0.0`을 사용합니다. PWA 서비스 워커는 프로덕션 빌드에서 활성화되며 설치에는 HTTPS 또는 localhost가 필요합니다. 정적 배포 서버에는 SPA fallback 설정이 필요합니다.

로컬 SQL 파일과 테스트 통과만으로 원격 DB 적용이 완료된 것은 아닙니다. 실제 적용 여부는 대상 프로젝트에서 별도로 확인합니다.

## 배포 시간 확인과 직접 배포

`npm run build`는 기존 생성·타입 검사·Vite/PWA 빌드를 모두 실행하고 단계별 시간과 출력 용량을 `artifacts/deploy/build-report.json`에 남깁니다. GitHub에서는 같은 결과를 작업 요약과 7일 보관 artifact로 확인합니다. 저장소 가져오기·패키지 설치·배포 업로드 시간은 각 서비스 로그에서 별도로 비교해야 합니다.

CI는 partial/sparse checkout으로 `assets`의 JSON 검수 자료만 가져오고 원본 이미지는 내려받지 않습니다. DB 작업은 `public`도 생략합니다. 실제 배포와 같은 앱 빌드는 `public`을 유지합니다. 기능 브랜치는 PR에서, main은 push에서 검사하여 같은 브랜치 push와 PR의 중복 실행을 피합니다. 브랜치 단독 검사는 Actions의 수동 실행으로 요청할 수 있습니다. 연속 푸시의 이전 검사는 취소하지만 테스트와 타입 검사는 생략하지 않습니다. 로컬 선택 규칙은 `npm run ci:checkout:check`로 검사합니다.

Git 연동이 지연될 때는 다음 명령으로 앱 빌드에 필요한 소스만 준비할 수 있습니다. 원본·manifest·검수 자료는 원래 위치에 보존합니다. 배포 폴더에는 `.env`·Storage 서버 키를 복사하지 않습니다.

```bash
npm run deploy:prepare -- --dry-run
npm run deploy:prepare -- --out .cache/deploy-source
cd .cache/deploy-source
vercel link --project pongdang-island --scope rokchas-projects
vercel deploy --archive=tgz
```

Vercel CLI 인증이 필요하며, 위 명령은 Preview 배포입니다. 연결 대상과 Preview를 확인한 후 운영 배포는 `vercel deploy --prod --archive=tgz`로 실행합니다. 환경변수는 연결한 Vercel 프로젝트의 Preview/Production 설정을 사용합니다. 이미 준비된 폴더는 덮어쓰지 않으므로 다음에는 새로운 `--out .cache/<이름>` 경로를 사용합니다. 직접 배포는 Git 이벤트 대기를 우회하지만 Vercel의 빌드·업로드 장애까지 우회하지는 않습니다.

`.vercelignore`는 원본·검수 파일을 배포 작업에서 제외합니다. Git 기반 Vercel 배포의 최초 clone 용량까지 줄인다는 뜻은 아닙니다. 큰 `public` 자산의 CDN 이전이나 원본 저장소 분리는 경로·캐시·재현 자료 보존을 검토하는 별도 작업입니다. PWA는 진행 중인 게임과 결과 처리가 끝날 때까지 업데이트 활성화를 기다립니다.
