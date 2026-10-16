# 사용자 제공 원격 구조 검토

근거: 사용자가 제공한 `schema.sql` JSON 결과. 캡처 2026-10-16 11:01:53 KST (`2026-10-16T02:01:53Z`), PostgreSQL 17.11, database `postgres`. 프로젝트 식별자는 결과에 없으므로 대상 프로젝트를 이 결과만으로 독립 검증하지 않았다. 캡처 이후 상태는 확인하지 않았다.

원본과 비교 결과는 git 제외 경로 `supabase/inspection/remote/schema-export.json`, `comparison.json`, `detailed-comparison.json`에 보관했다. 로컬 migrations의 기대 상태와 다르며 baseline 적용 완료로 간주하면 안 된다.

## 확인된 실제 차이

- 로컬 21개/68개에 비해 원격은 테이블 22개/함수 75개. 로컬 기존 테이블·컬럼·함수 시그니처의 누락은 없다.
- 원격에 `app_private.prepared_fishing_casts`와 낚시 준비/완료 RPC `prepare_fishing`, `finish_fishing`, 내부 payload 함수가 추가돼 있다.
- 원격 `app_private.cast_fishing`은 인증 검사 후 항상 `FISHING_FLOW_UPDATED`를 발생시킨다. 로컬 `src/features/fishing/api.ts`는 여전히 `public.cast_fishing`을 호출하므로 이 원격 DB에 연결하면 기존 낚시 경로는 실패한다.
- 원격 `fishing_state`는 `successChanceBp: 3500`과 진행 중인 `prepared`를 반환한다. `prepare_fishing`은 미끼 차감·성공 후보 추첨·준비 상태 저장, `finish_fishing`은 결과 확정·지급을 담당한다. 이는 기존 즉시 추첨 RPC와 다른 게임 흐름이다.
- `collectible_species.facing_direction`, `idle_animated`, `player_collectibles.flipped` 컬럼과 `arrange_collectible` RPC가 원격에 추가됐다. `place_collectible`은 원격에서 장식물 또는 fixed 이동 물고기에 한정된다.
- 로컬의 `collectible_nonfish_common` CHECK가 원격에는 없다. 의도 확인 없이 복구하면 원격 데이터와 충돌할 수 있다.

## 환경·표현 차이와 일치 항목

함수 정의의 CRLF/LF만 정규화하면 기존 함수 중 본문 차이는 `cast_fishing`, `fishing_state`, `place_collectible` 3개로 줄어든다. 나머지 다수의 함수 차이는 줄바꿈 표현이다. 제약 목록의 NOT NULL 표현 차이는 컬럼의 nullable 값과 함께 판단해야 하며 일괄 누락으로 해석하지 않는다.

원격의 service_role 권한은 로컬 최소 모사보다 넓다. 역할별 권한 차이는 유지해 표시하되, service_role 차이를 일반 클라이언트 권한 취약점으로 단정하지 않는다. 내보낸 테이블 권한에서 anon/authenticated의 직접 쓰기 권한은 없었다. 컬럼별 권한·함수 내부 인가까지 안전하다는 포괄적 결론은 아니다.

기존 공통 테이블의 RLS 설정과 컬럼 정의는 일치한다. 원격의 추가 테이블도 RLS가 켜져 있다. policies, triggers, enums, schemaGrants, publication, buckets, views, sequences 섹션은 로컬 결과와 일치했다.

## 다음 작업의 기준

원격을 로컬 baseline으로 되돌리지 않는다. 낚시/편집 흐름의 의도를 확인하고 원격 전용 변경을 정식 후속 migration·앱 계약·의미 있는 테스트에 반영해야 한다. 현재 로컬 테스트 통과는 위 원격과의 호환성을 증명하지 않는다. 이 검토에서는 원격 DB와 게임 동작을 변경하지 않았다.

카탈로그 행, 보유 데이터, 런타임 플래그, migration history, Auth 설정과 Storage 실제 파일은 이 export에 없어 미확인이다.
