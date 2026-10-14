# 퐁당섬

React + TypeScript + Vite로 만드는 모바일 낚시 게임 PWA의 시작 프로젝트입니다.

## 실행

```bash
npm install
npm run dev
```

개발 서버에서 브라우저 개발자 도구의 모바일 화면으로 확인합니다.
같은 Wi-Fi의 휴대폰에서 화면을 확인하려면 `npm run dev -- --host 0.0.0.0`을 사용합니다.

## 빌드 및 PWA 확인

```bash
npm run build
npm run preview
```

PWA 서비스 워커는 프로덕션 빌드에서만 활성화됩니다. 개발 중에는 서비스 워커 캐시가 HMR에 영향을 주지 않습니다.
설치 및 서비스 워커는 HTTPS 또는 localhost에서 확인합니다. 휴대폰에서 일반 HTTP LAN 주소로 접속하면 화면 확인은 가능하지만 PWA 설치는 제한될 수 있습니다.
처음 온라인으로 방문한 뒤 앱 기본 화면을 오프라인에서도 열 수 있습니다. 게임 데이터 저장 및 동기화는 아직 구현하지 않았습니다.
새 버전이 감지되면 Sonner 알림에서 업데이트를 선택할 수 있습니다.

## 구성

- 기본 글꼴: 고운돋움(Gowun Dodum), Fontsource 패키지로 앱에 포함
- Tailwind CSS v4: `src/index.css`, `vite.config.ts`
- shadcn/ui: `components.json`, `src/components/ui/`
- Sonner: 앱 전체 Toaster 및 알림 예시
- `@/*` 경로 별칭: `src/*`
- 모바일 safe area 및 터치 버튼, 한국어 메타 정보
- PWA manifest, 서비스 워커, 일반 및 maskable 아이콘

## 컴포넌트 추가

```bash
npx shadcn@latest add dialog
```

알림은 `import { toast } from 'sonner'` 후 `toast.success('메시지')` 등으로 호출합니다.

홈 화면은 `src/pages/home-page.tsx`입니다. 이메일 로그인·가입·닉네임 설정을 지원하며 낚시 로직과 푸시 알림은 아직 포함하지 않습니다.
아이콘을 수정할 때 Windows PowerShell에서 `./scripts/generate-icons.ps1`을 실행하면 PNG 아이콘을 다시 생성합니다.

## Supabase

`.env`에 프로젝트 URL과 publishable key를 설정했습니다. `.env`는 Git에서 제외되고, 새 환경에서는 `.env.example`을 복사해 값을 채웁니다. 변경 후에는 Vite 개발 서버를 재시작합니다.

```ts
import { createClient } from '@/lib/client'

const supabase = createClient()
```

요청한 `@supabase/supabase-client-react-router` 레지스트리 블록을 설치했으며, 현재 클라이언트 전용 Vite 구조에 맞춰 브라우저 클라이언트만 사용합니다. 인증은 SPA에 맞춰 supabase-js의 브라우저 세션과 PKCE를 사용합니다. 닉네임은 Auth 계정 메타데이터에 저장하므로 DB 테이블을 만들 필요가 없습니다.

Supabase 및 Postgres Agent Skills는 `.agents/skills/`에 설치되어 있습니다.

## 라우팅

React Router의 BrowserRouter를 `src/main.tsx`에서 설정합니다.

- `src/routes.tsx`: 경로 등록 (`/` 홈, `*` 404)
- `src/layouts/app-layout.tsx`: 공통 헤더, 푸터, Outlet
- `src/pages/`: 페이지 컴포넌트

새 페이지는 `src/pages/`에 만든 뒤 `src/routes.tsx`의 레이아웃 하위에 Route로 등록합니다. 앱 내부 이동은 `Link`, `NavLink`, `useNavigate`를 사용합니다.

배포 서버는 정적 파일을 제외한 페이지 URL 요청을 `index.html`로 연결하는 SPA fallback 설정이 필요합니다. Vite 개발 서버와 preview는 이를 기본 지원합니다. PWA는 생성된 서비스 워커의 navigation fallback을 사용합니다.


## 회원가입과 로그인

회원가입은 이메일·비밀번호(8자 이상)만 입력합니다. 성공하면 Supabase 세션을 유지하고 `/nickname`으로 이동합니다. 닉네임 저장 이후 홈으로 들어갑니다. 가입 인증 메일과 재발송 UI는 사용하지 않습니다.

### 필수 Supabase 설정

프로젝트: https://supabase.com/dashboard/project/ewafafphiovbpjwogwzn

Authentication → Sign In / Providers → Email → **Confirm email OFF**.
2026-10-14 마지막 확인 당시 ON이었습니다. 공개 키로는 이 설정을 바꿀 수 없으므로 대시보드에서 직접 꺼야 즉시 가입이 가능합니다. 이전에 ON 상태에서 가입한 미확인 계정은 별도 확인이 필요할 수 있습니다.

### 이메일 검사

- `src/lib/email-validation.ts`: 형식, 길이, 로컬 부분과 도메인 레이블 검사.
- 가입 제출 시 Google Public DNS HTTPS API로 도메인의 MX 레코드 확인. 도메인이 없거나 Null MX로 수신 불가를 명시하면 가입을 차단합니다. MX가 없을 경우 SMTP 규칙에 따라 A/AAAA 레코드도 확인합니다.
- DNS 조회는 최대 2.5초. 네트워크 장애, 응답 오류, 조회 차단은 이메일이 없다는 근거가 아니므로 가입을 계속합니다.
- DNS 서비스로는 도메인만 전송하며 이메일 전체와 비밀번호는 전송하지 않습니다. 인증 정보와 Referer도 보내지 않습니다.
- **도메인 수신 설정 검사는 개별 이메일 사서함의 존재나 소유권을 보장하지 않습니다.** 별도 이메일 검증 API나 확인 메일 없이 사서함 존재 여부를 확실히 검증할 수 없습니다.
- 브라우저 검사는 사용자 입력 보조이며 서버의 가입 정책이나 보안 검증을 대체하지 않습니다.

### 경로

- `/login`: 회원가입 / 로그인, 로그인 기억하기
- `/nickname`: 최초 닉네임 설정 및 변경
- `/`: 로그인과 닉네임 설정 후 홈
- `/forgot-password`: 비밀번호 재설정 메일 요청 및 이메일 주소 분실 안내
- `/auth/confirm?type=recovery`: 복구 링크 검증
- `/reset-password`: 복구 세션에서 새 비밀번호 설정

닉네임은 Auth의 `user_metadata.game_nickname`에 저장하고 중복을 허용합니다. 닉네임은 표시용이며 권한 판단에 사용하지 않습니다. 향후 게임 DB를 추가하면 사용자 ID 기반 RLS를 별도로 적용해야 합니다.

### 로그인 기억하기

체크하면 이메일과 세션을 localStorage에 유지합니다. 미체크 시 이메일 저장을 지우고 세션은 sessionStorage에 보관합니다. 비밀번호 원문은 저장하지 않으며 자동 입력은 브라우저 비밀번호 관리자를 사용합니다. 브라우저 탭 복원 정책에 따라 sessionStorage가 복원될 수 있습니다.

### 비밀번호 찾기

재설정 메일 → `/auth/confirm?type=recovery` → `/reset-password` → 비밀번호 변경 → 전체 세션 로그아웃 요청 → `/login?passwordReset=1`.
복구 메일 재요청은 60초 간격입니다. 가입 인증을 꺼도 비밀번호 찾기 메일은 필요하므로 일반 사용자에게 발송하려면 Custom SMTP를 설정해야 합니다. Supabase 기본 발송은 수신자/발송량 제한이 있습니다.

Supabase URL Configuration에 개발 주소를 설정하고 Redirect URLs에 다음을 등록합니다. preview나 배포에서는 실제 호스트와 포트에 맞춰 추가합니다.

```text
http://localhost:5173/auth/confirm?type=recovery
```

복구 메일 템플릿은 `supabase/templates/recovery.html`입니다. 기본 `{{ .ConfirmationURL }}` 링크는 요청한 브라우저에서 여는 PKCE 흐름을 사용합니다. 다른 기기에서도 열려면 커스텀 템플릿의 링크를 `{{ .RedirectTo }}&amp;token_hash={{ .TokenHash }}`로 변경한 뒤 검증합니다. 복구 페이지는 두 방식 모두 지원합니다.
이메일 주소 자체를 잊은 경우 메일함에서 퐁당섬 가입 흔적을 검색합니다. 추가 식별 정보를 수집하지 않아 이메일 역조회는 제공하지 않습니다.

### 검증

```bash
npm test
npm run build
```

테스트는 이메일 형식·DNS 결과·조회 장애, 즉시 가입 후 닉네임 리다이렉트, 기억하기 저장소 선택, 비밀번호 복구 링크와 변경 흐름을 검증합니다. 테스트는 외부 계정을 생성하거나 이메일을 보내지 않습니다.

공식 문서:
- https://supabase.com/docs/reference/javascript/auth-signup
- https://supabase.com/docs/guides/auth/passwords
- https://supabase.com/docs/guides/auth/auth-smtp
- https://developers.google.com/speed/public-dns/docs/doh/json
## 개발 컨텍스트와 친구/알림 시스템

- 기능별 코드 위치: [시스템 지도](docs/SYSTEM_MAP.md)
- 친구 요청과 실시간 알림: [시스템 설명](docs/systems/realtime-social.md)
- DB 최초 설치: [SQL 실행 순서](supabase/sql/README.md)

친구와 알림 기능을 사용하려면 위 SQL 01~05를 Supabase SQL Editor에서 먼저 실행하세요. 이 프로젝트 작업에서 원격 DB에는 자동 적용하지 않았습니다.

## 아바타

헤더 오른쪽 아바타 또는 홈의 프로필 꾸미기 → 이미지 선택 → 미리보기 → 저장.
기존 SQL 01~05를 설치했다면 `supabase/sql/06-avatars/01-avatar-storage.sql`을 추가 실행합니다.
[아바타 구조와 설정](docs/systems/avatar.md).
