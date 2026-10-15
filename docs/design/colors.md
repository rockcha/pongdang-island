# 공통 색상

퐁당섬의 기본 UI는 맑은 바다 파랑을 사용합니다. 색상 값은 `src/index.css`의 테마 변수에서 관리합니다.

| 역할 | 라이트 모드 | 사용하는 토큰 |
| --- | --- | --- |
| 기본 버튼·브랜드·선택 강조 | `#3B82F6` | `primary` |
| 기본 버튼 hover | `#2563EB` | `primary-hover` |
| 버튼 위 텍스트 | `#FFFFFF` | `primary-foreground` |
| 페이지 배경 | `#EFF6FF` | `background` |
| 카드·모달 | `#FFFFFF` | `card`, `popover` |
| 선택 배경·보조 버튼 | `#DBEAFE` | `accent`, `secondary` |
| 주요 텍스트 | `#1E3A5F` | `foreground` |
| 보조 텍스트 | `#52647A` | `muted-foreground` |
| 포커스 | `#3B82F6` | `ring` |

## 적용 규칙

- 공통 버튼은 `Button`과 `buttonVariants`를 사용합니다. 기본 버튼은 `bg-primary text-primary-foreground hover:bg-primary-hover`입니다.
- 링크·아이콘·체크박스 강조는 `text-primary`, `accent-primary`를 사용합니다. 화면별로 cyan·teal 색상을 추가하지 않습니다.
- 선택한 카드에는 `border-primary bg-primary/5` 또는 `bg-accent`를 사용합니다. 입력·포커스는 `border-input`, `ring-ring`을 사용합니다.
- 다크 모드는 같은 파랑 기본색과 어두운 남색 배경을 사용합니다. 배경과 텍스트를 직접 고정하지 않고 의미 토큰을 우선합니다.
- 희귀도 배지, 성공·오류·골드·알림 숫자, 풍경 이미지와 게임 내 배경 등 의미가 있는 색은 독립적으로 유지합니다.
- PWA의 테마·시작 배경은 `index.html`, `vite.config.ts`에도 같은 기본색·배경색을 반영합니다. 아이콘 생성 스크립트의 배경도 동일합니다.

## 적용 범위

공통 테마 및 버튼, 사이드바, 로그인 체크박스, 장소 배너의 이미지 로딩 배경, 선착장과 지역 이미지의 대체 배경, 항해 화면과 진행 막대, 아쿠아리움 대체 배경을 정리했습니다. 이미지 자산 자체는 재색칠하지 않습니다.
