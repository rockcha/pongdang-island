# 인증과 계정

[문서 목차](../README.md) · 구현: `src/components/auth-provider.tsx`, `src/lib/auth-storage.ts`, `src/pages/login-page.tsx`.

## 회원가입과 로그인

회원가입은 이메일·비밀번호(8자 이상)만 입력합니다. 성공하면 Supabase 세션을 유지하고 `/nickname`으로 이동합니다. 닉네임 저장 이후 홈으로 들어갑니다. 가입 인증 메일과 재발송 UI는 사용하지 않습니다.

### 필수 Supabase 설정

프로젝트는 로컬 `.env`의 URL에 해당하는 Supabase 대시보드에서 확인합니다.

Authentication → Sign In / Providers → Email → **Confirm email OFF**.
이것은 즉시 가입 흐름에 필요한 설정이며 현재 원격 설정을 확인했다는 의미는 아닙니다. 가입 문제가 있으면 대시보드의 실제 설정과 기존 계정의 확인 상태를 점검합니다.

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

닉네임은 Auth의 `user_metadata.game_nickname`에 저장하고 중복을 허용합니다. 닉네임은 표시용이며 권한 판단에 사용하지 않습니다. 게임 데이터의 권한은 사용자 ID 기반 DB RLS와 RPC에서 검증합니다.

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
