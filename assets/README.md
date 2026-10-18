# 에셋 안내

## 작업별 읽는 순서

| 작업 | 읽는 순서 |
| --- | --- |
| 새 어종·개체 생성 | [에셋 지침](AGENTS.md) → [등급별 그림체](references/collectible-style/README.md) → [방향·기존 예외](references/collectible-style/artwork-facing.md) → [저장·업로드 규칙](storage-upload/README.md) |
| 기존 이미지 교체 | 위 기준 + 해당 배치 README·manifest + 연결된 SQL |
| 생성된 PNG 업로드 | [업로드 규칙](storage-upload/README.md) → 해당 배치 README |
| 과거 프롬프트·생성 내역 조사 | [과거 기록 목차](storage-upload/history.md) → 필요한 기록만 |

## 폴더 역할

- `references/`: 현재 생성 기준과 실제 스타일 참고 이미지. 방향 예외 목록도 이곳에서 관리합니다.
- `storage-upload/`: 버킷 내부 경로에 맞춘 PNG와 업로드 안내.
- `storage-upload/new/YYYYMMDD-HHmmss/`: 생성 배치와 당시 README·manifest. 시간은 Asia/Seoul이며 새 배치도 이 형식을 사용합니다.
- `storage-upload/collectibles/`: 초기 개체 이미지와 과거 생성 기록.
- `../public/`: 앱에서 직접 제공하는 브랜드·배너·아이콘·연출 이미지.

`new/`는 기존 배치 보관 폴더 이름입니다. 최신 정책을 뜻하지 않습니다. `1052/`, `regional-fishing/`, `decorations/` 같은 기존 비표준 이름은 과거 경로로 보존하고 새 배치에는 사용하지 않습니다. 기존 경로는 검증 스크립트와 manifest가 참조하므로 이동하지 않습니다.

정책은 참고 기준 문서에, 생성 당시 결과는 배치 기록에 둡니다. 현재 규칙을 과거 프롬프트에서 추론하지 않습니다.

스프라이트 크기·화질 문제는 [크기·선명도 기준](references/collectible-style/sprite-sizing.md)을 확인합니다. [로컬 68종 측정 기록](../docs/history/sprite-quality-audit.md)과 읽기 전용 검사 스크립트를 제공합니다.
