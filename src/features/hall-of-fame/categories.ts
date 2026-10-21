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
} from 'lucide-react'

export const hallCategories = [
  {
    id: 'casts',
    title: '낚싯대가 퇴근 신청서를 냈어요.',
    label: '낚시 횟수',
    unit: '회',
    icon: Anchor,
    description: '직접 낚싯대를 던져 완료한 모든 낚시를 세어요.',
  },
  {
    id: 'fish',
    title: '이쯤 되면 물고기들이 닉네임을 외워요.',
    label: '잡은 물고기',
    unit: '마리',
    icon: Fish,
    description:
      '직접 낚시·투망·어선·통발로 잡은 물고기를 합산해요. 선물과 장식물·쓰레기는 제외해요.',
  },
  {
    id: 'collection',
    title: '바다 백과사전? 제가 썼는데요.',
    label: '도감 해금',
    unit: '%',
    icon: BookOpen,
    description: '현재 도감 전체에서 발견한 종류의 비율이에요. 지도는 제외해요.',
  },
  {
    id: 'mythic',
    title: '신화가 전설인 줄 알았는데 단골이었네.',
    label: '얻은 신화',
    unit: '개',
    icon: Sparkles,
    description: '직접 낚시·어선·통발 등으로 획득한 누적 신화 수예요. 받은 선물과 거래는 제외해요.',
  },
  {
    id: 'mythic_rate',
    title: '용왕님, 이분만 확률표가 다른가요?',
    label: '낚시 대비 신화 비율',
    unit: '%',
    icon: Sparkles,
    description:
      '직접 낚시 100회 이상인 퐁이의 전체 직접 낚시 횟수 대비 신화 획득 비율이에요. 통발·어선·선물·거래는 제외해요.',
  },
  {
    id: 'gifts',
    title: '선물함 문짝이 먼저 닳겠어요.',
    label: '친구에게 보낸 선물 횟수',
    unit: '회',
    icon: HandHeart,
    description:
      '친구에게 보낸 선물 수예요. 한 번에 여러 개를 보내도 1회이며 시스템 선물과 거래 배송은 제외해요.',
  },
  {
    id: 'sales',
    title: '사장님, 오늘도 완판인가요?',
    label: '거래소 물품 최다 판매',
    unit: '회',
    icon: TrendingUp,
    description:
      '거래소에서 판매자로 완료한 거래 횟수예요. 취소·진행 중 거래와 상점 판매는 제외해요.',
  },
  {
    id: 'purchases',
    title: '장바구니는 비웠는데 창고가 찼어요.',
    label: '거래소 물품 최다 구매',
    unit: '회',
    icon: Trophy,
    description:
      '거래소에서 구매자로 완료한 거래 횟수예요. 취소·진행 중 거래와 상점 구매는 제외해요.',
  },
  {
    id: 'titles',
    title: '이름보다 수식어가 더 길어졌어요.',
    label: '획득한 칭호 개수',
    unit: '개',
    icon: BookOpen,
    description: '서버에 획득 기록이 남아 있는 서로 다른 칭호의 개수예요.',
  },
  {
    id: 'cleanings',
    title: '물때가 이분 접속하면 도망가요.',
    label: '친구 어항 청소 횟수',
    unit: '회',
    icon: Waves,
    description: '친구 어항 청소를 끝까지 완료한 횟수예요. 청소 중인 기록은 제외해요.',
  },
  {
    id: 'feedings',
    title: '물고기들이 밥 주는 손을 알아봐요.',
    label: '친구 물고기 먹이 주기 횟수',
    unit: '회',
    icon: Fish,
    description:
      '친구 어항 먹이 주기를 끝까지 완료한 횟수예요. 먹이를 누른 횟수가 아닌 완료 횟수예요.',
  },
  {
    id: 'voyages',
    title: '선장님 달력에는 쉬는 날이 없어요.',
    label: '어선 파견 횟수',
    unit: '회',
    icon: Anchor,
    description: '어선을 출항시킨 누적 횟수예요. 항해 중인 어선도 포함하며 통발은 제외해요.',
  },
  {
    id: 'failure_rate',
    title: '물고기가 단체로 읽씹 중이에요.',
    label: '낚시 실패 비율',
    unit: '%',
    icon: Waves,
    description: '직접 낚시 100회 이상인 퐁이 중 실패 비율을 비교해요.',
  },
  {
    id: 'games',
    title: '오락실 의자에 이름 새겨도 되겠어요.',
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
    title: '오늘 바다 대관하신 분 찾습니다.',
    label: '하루 최다 낚시',
    unit: '회',
    icon: Flame,
    description: '한국 시간 하루 동안 완료한 직접 낚시의 개인 최고 기록이에요.',
  },
  {
    id: 'control_miss',
    title: '분명 눌렀는데요. 진짜 눌렀는데요.',
    label: '최다 조작 MISS',
    unit: '회',
    icon: Anchor,
    description:
      '직접 낚시에서 서버에 조작 실패로 기록된 누적 횟수예요. 확률 실패·시간 만료는 제외하며 원인이 남지 않은 과거 실패는 세지 않아요.',
  },
  {
    id: 'decorations',
    title: '어항보다 소품 창고가 커졌어요.',
    label: '장식물 획득',
    unit: '개',
    icon: Sparkles,
    description:
      '직접 낚시·통발·어선 등으로 획득한 누적 장식물 수예요. 받은 선물과 거래는 제외해요.',
  },
  {
    id: 'trash',
    title: '낚시하러 왔다가 환경상을 받았어요.',
    label: '쓰레기 획득',
    unit: '개',
    icon: Trash2,
    description: '직접 낚시로 건져 올린 쓰레기의 누적 개수예요.',
  },
  {
    id: 'arcade_earned',
    title: '게임은 취미고 수입은 본업이에요.',
    label: '미니게임에서 번 돈',
    unit: '골드',
    icon: Gamepad2,
    description:
      '미니게임에서 실제로 지급받은 누적 골드예요. 참가비를 빼기 전 총수입이며 주간 순위 선물은 제외해요.',
  },
  {
    id: 'arcade_spent',
    title: '한 판만 더, 라고 300번 말했어요.',
    label: '미니게임에 사용한 돈',
    unit: '골드',
    icon: Gamepad2,
    description:
      '미니게임 참가비와 사다리 판돈으로 실제 사용한 누적 골드예요. 무료 연습은 제외해요.',
  },
  {
    id: 'failure_run',
    title: '용왕님도 이 끈기에는 박수 쳐요.',
    label: '최다 연속 실패',
    unit: '회',
    icon: Anchor,
    description: '직접 낚시에서 성공 없이 연속으로 실패한 최장 기록이에요.',
  },
  {
    id: 'likes',
    title: '섬에 팬클럽 창단 소문이 돌아요.',
    label: '받은 좋아요',
    unit: '개',
    icon: ThumbsUp,
    description:
      '명예의 전당과 자유게시판의 글·댓글에서 받은 좋아요를 합산해요. 자기 반응은 제외해요.',
  },
  {
    id: 'dislikes',
    title: '오늘도 섬의 뜨거운 감자예요.',
    label: '받은 싫어요',
    unit: '개',
    icon: ThumbsDown,
    description:
      '명예의 전당과 자유게시판의 글·댓글에서 받은 싫어요를 합산해요. 자기 반응은 제외해요.',
  },
  {
    id: 'helps',
    title: '친구가 부르기 전에 이미 와 있어요.',
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
