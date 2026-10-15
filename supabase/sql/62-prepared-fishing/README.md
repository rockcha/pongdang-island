# 62 사전 추첨 낚시

61 이후 `01-prepared-fishing.sql` 전체를 Supabase SQL Editor에서 실행합니다. 이미지 업로드는 필요 없습니다. SQL 파일 생성만으로 원격 DB에 적용되지는 않습니다.

- 시작 시 성공 예정 **35%**, 이후 미끼·해역에 따른 조건부 등급/개체 추첨.
- 미끼는 시작 시 1개 소모. 미니게임 실패·취소·만료는 획득 없음, 환불 없음.
- 성공 예정 + 미니게임 성공일 때만 예약한 개체를 지급.
- `prepare_fishing`과 `finish_fishing`은 operation_id로 재시도해도 추가 소모/중복 지급 없음.
- 계정별 동시 예약 1개, 3분 만료, 이전 미완료 예약은 이어하기 가능.
- 기존 `cast_fishing`은 우회 지급을 막기 위해 새 실행을 거절. 기존 이력은 보존.
- 새 테이블은 app_private에 두고 RLS 및 직접 접근 차단. 기존 보상 권한/지갑 잠금 패턴 유지.
- 일반·희귀·특급·신화 테스트는 브라우저의 연습 전용이며 서버에 강제 등급 인자를 보내지 않음.

성공 여부는 클라이언트 미니게임 보고를 받습니다. 서버는 고정된 35% 결과·소유권·최소 경과 시간·만료·중복 확정을 검증하지만 전체 입력을 재시뮬레이션하지는 않습니다.

검증: `npm.cmd test -- tests/prepared-fishing-sql.test.ts tests/tension-game.test.ts tests/tension-fishing-game.test.tsx tests/fishing-panel.test.tsx`

적용 후 확률 확인:

```sql
select public.fishing_state();
```

`successChanceBp`는 3500, `baits`의 등급 확률은 성공 예정일 때 합계 10000입니다. 테스트 낚시를 시작하면 보유 미끼가 1개 줄고 미완료 `prepared`가 표시됩니다. 실제 낚시는 앱에서 진행하며 연습은 상단 힘 테스트 버튼을 사용합니다.
