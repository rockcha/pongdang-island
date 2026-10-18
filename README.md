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
