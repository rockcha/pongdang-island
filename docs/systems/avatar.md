# 아바타 / 내 프로필

## 사용

헤더 오른쪽 아바타 또는 홈의 프로필 꾸미기를 눌러 `/profile`로 이동합니다.

1. JPG/PNG/WebP(5MB 이하) 선택.
2. 브라우저에서 중앙을 512×512 정사각형으로 맞춰 WebP로 변환.
3. 원형 미리보기 확인 → 아바타 저장.
4. 기본 아바타로 되돌리기를 누르면 사진 대신 닉네임 앞 글자를 표시.

이미지는 Supabase Storage에 저장되며 프로필에는 `avatar_path`만 저장합니다. 헤더, 친구 코드 검색 결과, 받은/보낸 요청과 친구 목록에서 shadcn Avatar로 표시합니다. 로딩/파일 오류 시 닉네임으로 대체합니다. 로그아웃은 내 프로필 화면 하단에 있습니다.

## DB 설치

DB 변경은 [DB 관리](database-management.md)를 따릅니다. 기존 번호 SQL은 동결된 구현 이력으로 재실행하지 않습니다. 현재 정의는 로컬 컨텍스트에서, 실제 원격 상태는 별도 조회로 확인합니다.

06 SQL은 다음을 추가합니다.

- player_profiles.avatar_path nullable 컬럼.
- avatars 공개 버킷, 서버 파일 제한 5MB, 저장 MIME image/webp.
- 본인 UUID 폴더의 조회/신규 업로드/삭제 정책. 덮어쓰기 UPDATE는 허용하지 않음.
- set_player_avatar RPC: auth.uid()와 경로 및 실제 업로드 객체의 WebP 메타데이터 검증.
- player_profiles를 Realtime Publication에 추가.

프로필 사진은 공개 URL로 표시되는 프로필 이미지입니다. URL을 아는 사람은 파일을 읽을 수 있지만 다른 사용자 파일의 열거/업로드/삭제는 정책으로 제한합니다. 공개가 필요한 프로필 사진만 업로드합니다.

## 코드 위치

| 경로 | 역할 |
| --- | --- |
| src/features/profile/profile-page.tsx | shadcn 기반 프로필 UI·선택·미리보기·저장·복원 |
| src/features/profile/player-avatar.tsx | 공통 Avatar와 닉네임 fallback |
| src/features/profile/avatar-api.ts | 파일 검사·WebP 변환·Storage/RPC 저장·정리 |
| src/components/ui/avatar.tsx | shadcn Avatar |
| src/features/social/social-provider.tsx | 프로필 재조회 및 관련 프로필 UPDATE 실시간 반영 |
| src/features/friends/api.ts | 친구 프로필에 avatar_path 포함 |
| src/lib/database.types.ts | 컬럼/RPC 타입 |
| supabase/sql/06-avatars/01-avatar-storage.sql | 추가 DB/Storage 설정 |
| tests/avatar.test.ts | 검증·저장 순서·실패 시 새 파일 정리·복원 |
| tests/social-sql.test.ts | 로컬 PostgreSQL에서 경로/RPC/Storage 정책 검증 |

## 저장과 캐시

객체 경로는 `사용자UUID/새UUID.webp`입니다. 새 파일명으로 업로드해 CDN 캐시 때문에 이전 이미지가 남는 문제를 피합니다. 프로필 저장이 성공한 후에만 이전 파일을 지웁니다. DB 저장이 실패하면 새 파일 정리를 시도하고 기존 아바타를 유지합니다. 네트워크 오류로 정리가 실패한 파일은 남을 수 있습니다.

Canvas 변환으로 이미지 원본의 추가 메타데이터를 그대로 보관하지 않습니다. 입력의 최대 해상도는 4천만 픽셀입니다. 잘못된 파일이나 브라우저가 디코딩할 수 없는 이미지는 저장하지 않습니다.

## 확인

`npm test`, `npm run build`.

SQL 테스트는 Storage 테이블의 최소 모형과 실제 PostgreSQL RLS를 사용합니다. 실제 Storage HTTP 업로드·브라우저 이미지 디코딩·공개 URL 표시는 원격 SQL 적용 후 직접 확인해야 합니다.

1. 06 SQL 실행 후 앱 새로고침.
2. 내 프로필에서 이미지 선택/미리보기/취소/저장.
3. 새로고침 후 유지 확인, 다른 브라우저의 친구 목록에 반영 확인.
4. 다른 사용자 폴더 업로드/삭제 불가, 기본 아바타 복원 확인.
