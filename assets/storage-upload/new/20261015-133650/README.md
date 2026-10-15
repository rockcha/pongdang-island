# 산호빛 여울 토착 6종 에셋

생성 시작: 2026-10-15 13:36:50 Asia/Seoul. 내장 image_gen 사용.

| 이름 | 등급 | 종류 | 이동 |
| --- | --- | --- | --- |
| 산호콩 새우 | 일반 | 어종 | crawl |
| 분홍턱 베도라치 | 일반 | 어종 | swim |
| 꽃산호 해룡 | 희귀 | 어종 | swim |
| 산호부채 나비고기 | 희귀 | 어종 | swim |
| 산호꽃 말미잘 | 희귀 | 장식물 | fixed |
| 산호왕관 거북 | 특급 | 어종 | swim |

모두 coral 토착이며 서식지는 산호빛 여울 하나입니다. 어종 5종은 썸네일·2×2 시트 각각 한 장, 장식물 말미잘은 썸네일 한 장으로 총 11 PNG입니다.

그림체: [저장된 등급별 참고](../../../references/collectible-style/README.md). 일반·희귀는 퐁이 카툰, 특급은 별빛 가오리의 부드러운 판타지 채색을 적용합니다. 참고 경로와 최종 프롬프트는 manifest.json에 기록합니다.

```powershell
npm.cmd run storage:upload -- assets/storage-upload/new/20261015-133650
```

[38번 등록 SQL](../../../../supabase/sql/38-coral-natives/01-coral-natives.sql)은 37번 이후 적용합니다. SQL의 운영 DB 실행은 별도입니다. 업로드 확인은 upload-report.json에 기록합니다.

## 완료 기록

PNG 11장 생성·Storage 업로드를 완료했습니다. 11개 공개 URL을 다시 내려받아 로컬 원본과 SHA-256 일치를 확인했습니다. [업로드 검증](upload-report.json), [최종 프롬프트·참고 이미지 경로](manifest.json), [투명 가장자리·프레임 경계 검사](alpha-report.json)를 보관합니다.

SQL은 단일 서식지 제약과 반복 실행·배치 보존 테스트를 통과했으며, 아직 운영 DB에는 실행하지 않았습니다.
