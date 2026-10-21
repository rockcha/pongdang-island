import {
  Anchor,
  BookOpen,
  Fish,
  Flame,
  Gamepad2,
  HandHeart,
  Moon,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  TrendingUp,
  Trophy,
  Waves,
} from 'lucide-react'

export const hallCategories = [
  {
    id: 'casts',
    title: '천 번의 캐스팅',
    label: '낚시 횟수',
    unit: '회',
    icon: Anchor,
    description: '직접 낚싯대를 던져 완료한 모든 낚시를 세어요.',
  },
  {
    id: 'fish',
    title: '만선의 주인공',
    label: '잡은 물고기',
    unit: '마리',
    icon: Fish,
    description:
      '직접 낚시·투망·어선·통발로 잡은 물고기를 합산해요. 선물과 장식물·쓰레기는 제외해요.',
  },
  {
    id: 'collection',
    title: '바다의 백과사전',
    label: '도감 해금',
    unit: '%',
    icon: BookOpen,
    description: '현재 도감 전체에서 발견한 종류의 비율이에요. 지도는 제외해요.',
  },
  {
    id: 'mythic',
    title: '신화를 낚는 자',
    label: '얻은 신화',
    unit: '개',
    icon: Sparkles,
    description: '직접 낚시·어선·통발 등으로 획득한 누적 신화 수예요. 받은 선물과 거래는 제외해요.',
  },
  {
    id: 'failure_rate',
    title: '용왕의 외면',
    label: '낚시 실패 비율',
    unit: '%',
    icon: Waves,
    description: '직접 낚시 100회 이상인 퐁이 중 실패 비율을 비교해요.',
  },
  {
    id: 'games',
    title: '오락실 단골',
    label: '미니게임 플레이',
    unit: '회',
    icon: Gamepad2,
    description:
      '서버에 기록된 벽돌깨기·그림자·기억력·홀짝·사다리 플레이 수예요. 무료 연습은 제외해요.',
  },
] as const

export const funCategories = [
  {
    id: 'daily',
    title: '오늘 바다 전세 냈다',
    label: '하루 최다 낚시',
    unit: '회',
    icon: Flame,
    description: '한국 시간 하루 동안 완료한 직접 낚시의 개인 최고 기록이에요.',
  },
  {
    id: 'success_run',
    title: '끊기지 않는 손맛',
    label: '최다 연속 성공',
    unit: '회',
    icon: TrendingUp,
    description: '직접 낚시에서 실패 없이 연속으로 획득에 성공한 최장 기록이에요.',
  },
  {
    id: 'failure_run',
    title: '꺾이지 않는 낚싯대',
    label: '최다 연속 실패',
    unit: '회',
    icon: Anchor,
    description: '직접 낚시에서 성공 없이 연속으로 실패한 최장 기록이에요.',
  },
  {
    id: 'trash',
    title: '바다 청소부',
    label: '낚아 올린 쓰레기',
    unit: '개',
    icon: Trash2,
    description: '직접 낚시로 건져 올린 쓰레기의 누적 개수예요.',
  },
  {
    id: 'days',
    title: '개근 강태공',
    label: '최장 연속 낚시 일수',
    unit: '일',
    icon: Moon,
    description: '한국 시간 기준 하루 한 번 이상 직접 낚시한 날의 최장 연속 기록이에요.',
  },
  {
    id: 'likes',
    title: '섬의 인기스타',
    label: '받은 좋아요',
    unit: '개',
    icon: ThumbsUp,
    description:
      '명예의 전당과 자유게시판의 글·댓글에서 받은 좋아요를 합산해요. 자기 반응은 제외해요.',
  },
  {
    id: 'dislikes',
    title: '화제의 퐁이',
    label: '받은 싫어요',
    unit: '개',
    icon: ThumbsDown,
    description:
      '명예의 전당과 자유게시판의 글·댓글에서 받은 싫어요를 합산해요. 자기 반응은 제외해요.',
  },
  {
    id: 'helps',
    title: '도움왕',
    label: '친구 도와준 횟수',
    unit: '회',
    icon: HandHeart,
    description: '친구 먹이 주기·어항 청소를 완료한 횟수와 통발에 순풍을 보낸 횟수를 합산해요.',
  },
] as const
export type HallCategory = (typeof hallCategories)[number] | (typeof funCategories)[number]
export const HallIcon = Trophy
export function formatHallValue(value: number, unit: string) {
  return value.toLocaleString('ko-KR', { maximumFractionDigits: unit === '%' ? 1 : 0 }) + unit
}
