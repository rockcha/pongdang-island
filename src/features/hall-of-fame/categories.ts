import {
  Anchor,
  BookOpen,
  Fish,
  Flame,
  Gamepad2,
  HandHeart,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  TrendingUp,
  Trophy,
  Waves,
  Route,
  Dices,
  BrickWall,
  ScanSearch,
  Brain,
} from 'lucide-react'

export const hallCategories = [
  {
    id: 'casts',
    title: '성공·실패를 합산한 직접 낚시 완료 횟수',
    label: '낚싯대 과로 유발자',
    unit: '회',
    icon: Anchor,
    description: '직접 낚싯대를 던져 완료한 모든 낚시를 세어요.',
  },
  {
    id: 'fish',
    title: '직접 낚시·투망·어선·통발로 잡은 물고기 수',
    label: '물고기 출석부 반장',
    unit: '마리',
    icon: Fish,
    description:
      '직접 낚시·투망·어선·통발로 잡은 물고기를 합산해요. 선물과 장식물·쓰레기는 제외해요.',
  },
  {
    id: 'collection',
    title: '전체 도감 중 발견한 종류의 비율 · 지도 제외',
    label: '걸어 다니는 바다사전',
    unit: '%',
    icon: BookOpen,
    description: '현재 도감 전체에서 발견한 종류의 비율이에요. 지도는 제외해요.',
  },
  {
    id: 'mythic',
    title: '직접 낚시·어선·통발 등으로 획득한 신화 수',
    label: '신화도 이 집 단골',
    unit: '개',
    icon: Sparkles,
    description: '직접 낚시·어선·통발 등으로 획득한 누적 신화 수예요. 받은 선물과 거래는 제외해요.',
  },
  {
    id: 'mythic_rate',
    title: '직접 낚시 횟수 대비 신화 획득 비율 · 100회 이상',
    label: '용왕님 비밀 단골',
    unit: '%',
    icon: Sparkles,
    description:
      '직접 낚시 100회 이상인 퐁이의 전체 직접 낚시 횟수 대비 신화 획득 비율이에요. 통발·어선·선물·거래는 제외해요.',
  },
  {
    id: 'gifts',
    title: '친구에게 선물을 보낸 횟수 · 여러 개도 한 번이면 1회',
    label: '산타도 쉬게 하는 퐁이',
    unit: '회',
    icon: HandHeart,
    description:
      '친구에게 보낸 선물 수예요. 한 번에 여러 개를 보내도 1회이며 시스템 선물과 거래 배송은 제외해요.',
  },
  {
    id: 'sales',
    title: '거래소에서 판매자로 완료한 거래 횟수',
    label: '바다 장사의 신',
    unit: '회',
    icon: TrendingUp,
    description:
      '거래소에서 판매자로 완료한 거래 횟수예요. 취소·진행 중 거래와 상점 판매는 제외해요.',
  },
  {
    id: 'purchases',
    title: '거래소에서 구매자로 완료한 거래 횟수',
    label: '지갑은 얇고 창고는 빵빵',
    unit: '회',
    icon: Trophy,
    description:
      '거래소에서 구매자로 완료한 거래 횟수예요. 취소·진행 중 거래와 상점 구매는 제외해요.',
  },
  {
    id: 'titles',
    title: '획득한 서로 다른 칭호의 개수',
    label: '이름표가 본체',
    unit: '개',
    icon: BookOpen,
    description: '서버에 획득 기록이 남아 있는 서로 다른 칭호의 개수예요.',
  },
  {
    id: 'cleanings',
    title: '친구 어항 청소를 끝까지 완료한 횟수',
    label: '물때의 천적',
    unit: '회',
    icon: Waves,
    description: '친구 어항 청소를 끝까지 완료한 횟수예요. 청소 중인 기록은 제외해요.',
  },
  {
    id: 'feedings',
    title: '친구 어항 먹이 주기를 끝까지 완료한 횟수',
    label: '물고기 급식실장',
    unit: '회',
    icon: Fish,
    description:
      '친구 어항 먹이 주기를 끝까지 완료한 횟수예요. 먹이를 누른 횟수가 아닌 완료 횟수예요.',
  },
  {
    id: 'voyages',
    title: '어선을 출항시킨 횟수 · 항해 중 포함, 통발 제외',
    label: '선장님은 휴가 반납',
    unit: '회',
    icon: Anchor,
    description: '어선을 출항시킨 누적 횟수예요. 항해 중인 어선도 포함하며 통발은 제외해요.',
  },
  {
    id: 'failure_rate',
    title: '직접 낚시 횟수 대비 실패 비율 · 100회 이상',
    label: '물고기에게 읽씹당한 퐁이',
    unit: '%',
    icon: Waves,
    description: '직접 낚시 100회 이상인 퐁이 중 실패 비율을 비교해요.',
  },
  {
    id: 'games',
    title: '미니게임을 플레이한 횟수 · 무료 연습 제외',
    label: '오락실 붙박이 손님',
    unit: '회',
    icon: Gamepad2,
    description:
      '서버에 기록된 벽돌깨기·그림자·기억력·홀짝·사다리 플레이 수예요. 무료 연습은 제외해요.',
  },
] as const

export const funCategories = [
  {
    id: 'daily',
    title: '한국 시간 하루 동안 완료한 직접 낚시의 개인 최고 횟수',
    label: '바다 전세 낸 퐁이',
    unit: '회',
    icon: Flame,
    description: '한국 시간 하루 동안 완료한 직접 낚시의 개인 최고 기록이에요.',
  },
  {
    id: 'control_miss',
    title: '직접 낚시에서 조작 실패로 기록된 누적 횟수',
    label: '손이 미끄러웠을 뿐',
    unit: '회',
    icon: Anchor,
    description:
      '직접 낚시에서 서버에 조작 실패로 기록된 누적 횟수예요. 확률 실패·시간 만료는 제외하며 원인이 남지 않은 과거 실패는 세지 않아요.',
  },
  {
    id: 'decorations',
    title: '직접 낚시·통발·어선 등으로 획득한 장식물 수',
    label: '어항 인테리어 장인',
    unit: '개',
    icon: Sparkles,
    description:
      '직접 낚시·통발·어선 등으로 획득한 누적 장식물 수예요. 받은 선물과 거래는 제외해요.',
  },
  {
    id: 'trash',
    title: '직접 낚시로 건져 올린 쓰레기의 누적 개수',
    label: '바닷가 청소부',
    unit: '개',
    icon: Trash2,
    description: '직접 낚시로 건져 올린 쓰레기의 누적 개수예요.',
  },
  {
    id: 'arcade_earned',
    title: '미니게임으로 받은 총 골드 · 참가비 차감 전, 주간 선물 제외',
    label: '오락실 금손',
    unit: '골드',
    icon: Gamepad2,
    description:
      '미니게임에서 실제로 지급받은 누적 골드예요. 참가비를 빼기 전 총수입이며 주간 순위 선물은 제외해요.',
  },
  {
    id: 'arcade_spent',
    title: '미니게임 참가비와 사다리 판돈으로 사용한 총 골드',
    label: '오락실 건물주 후원자',
    unit: '골드',
    icon: Gamepad2,
    description:
      '미니게임 참가비와 사다리 판돈으로 실제 사용한 누적 골드예요. 무료 연습은 제외해요.',
  },
  {
    id: 'failure_run',
    title: '직접 낚시에서 연속으로 실패한 개인 최장 횟수',
    label: '꺾이지 않는 낚싯대',
    unit: '회',
    icon: Anchor,
    description: '직접 낚시에서 성공 없이 연속으로 실패한 최장 기록이에요.',
  },
  {
    id: 'likes',
    title: '명예의 전당·자유게시판 글과 댓글에서 받은 좋아요 수',
    label: '퐁당섬 인기스타',
    unit: '개',
    icon: ThumbsUp,
    description:
      '명예의 전당과 자유게시판의 글·댓글에서 받은 좋아요를 합산해요. 자기 반응은 제외해요.',
  },
  {
    id: 'dislikes',
    title: '명예의 전당·자유게시판 글과 댓글에서 받은 싫어요 수',
    label: '퐁당섬 뜨거운 감자',
    unit: '개',
    icon: ThumbsDown,
    description:
      '명예의 전당과 자유게시판의 글·댓글에서 받은 싫어요를 합산해요. 자기 반응은 제외해요.',
  },
  {
    id: 'helps',
    title: '친구 먹이 주기·어항 청소 완료와 통발 순풍 횟수의 합계',
    label: '부르면 오는 퐁반장',
    unit: '회',
    icon: HandHeart,
    description: '친구 먹이 주기·어항 청소를 완료한 횟수와 통발에 순풍을 보낸 횟수를 합산해요.',
  },
  {
    id: 'ladder_plays',
    title: '사다리를 플레이한 누적 횟수 · 무료 연습 제외',
    label: '사다리의 왕',
    unit: '회',
    icon: Route,
    description: '서버에 기록된 사다리 플레이 횟수예요. 한 판을 한 번으로 세며 무료 연습은 제외해요.',
  },
  {
    id: 'odd_even_plays',
    title: '홀짝을 시작한 누적 횟수 · 무료 연습 제외',
    label: '홀짝의 왕',
    unit: '회',
    icon: Dices,
    description: '서버에 기록된 홀짝 시작 횟수예요. 한 판의 여러 라운드는 한 번으로 세며 무료 연습은 제외해요.',
  },
  {
    id: 'brick_plays',
    title: '벽돌깨기를 시작한 누적 횟수 · 무료 연습 제외',
    label: '벽돌깨기의 왕',
    unit: '회',
    icon: BrickWall,
    description: '서버에 기록된 벽돌깨기 시작 횟수예요. 진행 중인 판도 포함하며 무료 연습은 제외해요.',
  },
  {
    id: 'shadow_plays',
    title: '그림자 맞히기를 시작한 누적 횟수 · 무료 연습 제외',
    label: '그림자 맞히기의 왕',
    unit: '회',
    icon: ScanSearch,
    description: '서버에 기록된 그림자 맞히기 시작 횟수예요. 한 판을 한 번으로 세며 무료 연습은 제외해요.',
  },
  {
    id: 'memory_plays',
    title: '기억력 게임을 시작한 누적 횟수 · 무료 연습 제외',
    label: '기억력 게임의 왕',
    unit: '회',
    icon: Brain,
    description: '서버에 기록된 기억력 게임 시작 횟수예요. 한 판을 한 번으로 세며 무료 연습은 제외해요.',
  },
] as const
export type HallCategory = (typeof hallCategories)[number] | (typeof funCategories)[number]
export const HallIcon = Trophy
export function formatHallValue(value: number, unit: string) {
  return value.toLocaleString('ko-KR', { maximumFractionDigits: unit === '%' ? 1 : 0 }) + unit
}
