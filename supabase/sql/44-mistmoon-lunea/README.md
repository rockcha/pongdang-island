# 안개달 토착생물·루네아 등록

43번 적용 후 [01-mistmoon-lunea.sql](01-mistmoon-lunea.sql) 전체를 Supabase SQL Editor에서 실행합니다. 이미지 16개는 Storage에 업로드했습니다. **원격 DB 등록은 SQL Editor 실행 대기**입니다. 현재 연결에는 SQL 실행 인터페이스가 없어 종·서식지를 같은 트랜잭션으로 등록하는 이 SQL을 직접 적용할 수 없습니다.

[이미지·8종 설정](../../../assets/storage-upload/new/20261015-165350/README.md)을 참고하세요. 일반 3종, 희귀 2종, 특급 2종, 인어 형태의 신화 안개달의 여신 루네아가 모두 `mistmoon` 한 곳에만 서식합니다. 기존 개체와 보유·배치 기록은 보존하며 재실행해도 중복 등록되지 않습니다.

검증: 로컬 Postgres 호환 환경에서 SQL 반복 적용과 서식지·등급·이동 설정을 검사합니다. 이미지 검사는 `node scripts/verify-mistmoon-lunea.mjs`로 실행합니다.
