import type { DropKind } from './brick-breaker-model'

export const brickDrops: { kind: DropKind; name: string; detail: string }[] = [
  { kind: 'poison', name: '독극물 병', detail: '독액 3방울 · 닿으면 생명 −1' },
  { kind: 'item', name: '수중 미사일', detail: '양쪽으로 수중 미사일 2발' },
  { kind: 'wide', name: '긴 널판지', detail: '8초 동안 널판지 확장' },
  { kind: 'shield', name: '물방울 보호막', detail: '방해물 보호 1회 · 중첩 없음' },
  { kind: 'split', name: '진주 분열', detail: '다음 패들 반사 때 공 2개 발사' },
  { kind: 'heart', name: '하트 회복', detail: '생명력 +1 · 최대 3개' },
  { kind: 'magnet', name: '집게 자석', detail: '다음 공을 붙잡고 원하는 때 발사' },
  { kind: 'wave', name: '파도 탄환', detail: '즉시 전방 발사 · 끝까지 관통 · 피해 1' },
  {
    kind: 'dash',
    name: '돌진하는 퐁이',
    detail: '위로 돌진 · 처음 맞는 벽돌 1개 즉시 파괴',
  },
  { kind: 'star', name: '불가사리 표창', detail: '회전 표창 5연발 · 각각 피해 1' },
  { kind: 'pirate', name: '해적의 동전', detail: '획득 즉시 보상 +20 골드' },
  {
    kind: 'whale',
    name: '혹등고래의 노래',
    detail: '남아 있는 가장 아래 줄 전체에 피해 1',
  },
  { kind: 'treasure', name: '해적의 보물', detail: '획득 즉시 보상 +50 골드' },
  { kind: 'anchor', name: '무거운 닻', detail: '쇠사슬 낙하 · 점점 가속 · 생명 −1' },
  {
    kind: 'torpedo',
    name: '어뢰',
    detail: '가까운 양 끝으로 이동 · 10초 후 폭발 · 반경 2칸',
  },
  { kind: 'jelly', name: '독해파리', detail: '좌우로 흐물흐물 · 느린 하강 · 생명 −1' },
  { kind: 'shark', name: '돌진 상어', detail: '맞으면 목숨 −1' },
  { kind: 'urchin', name: '성게 트리오', detail: '좁게 퍼지는 성게 3개 · 생명 −1' },
  { kind: 'ink', name: '먹물 문어', detail: '6초 동안 일부 시야 가림' },
  { kind: 'seaweed', name: '매운 해초', detail: '6초 동안 공 속도 ×1.5' },
  { kind: 'puffer', name: '양갈래 복어', detail: '두 갈래로 천천히 유영 · 생명 −1' },
  { kind: 'sticky', name: '끈끈이 액체', detail: '6초 동안 패들 이동 속도 ×0.5' },
  { kind: 'shrink', name: '널판지 축소', detail: '6초 동안 널판지가 짧아져요' },
]
