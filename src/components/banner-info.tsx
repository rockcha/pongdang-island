import { Info } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog'

export function BannerInfo({ title, steps }: { title: string; steps: string[] }) {
  return (
    <Dialog>
      <DialogTrigger
        aria-label={`${title} 안내`}
        className="pointer-events-auto inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-white/90 outline-none transition-colors hover:bg-white/15 hover:text-white focus-visible:ring-2 focus-visible:ring-white"
      >
        <Info aria-hidden="true" className="size-4" />
      </DialogTrigger>
      <DialogContent className="max-h-[80dvh] max-w-sm gap-4 overflow-y-auto rounded-xl">
        <DialogHeader className="pr-6">
          <DialogTitle>{title} 이용 안내</DialogTitle>
          <DialogDescription>이곳에서 할 수 있어요</DialogDescription>
        </DialogHeader>
        <ol className="space-y-3">
          {steps.map((step, index) => (
            <li key={step} className="flex items-start gap-3 rounded-lg bg-secondary/50 p-3">
              <span
                aria-hidden="true"
                className="grid size-6 shrink-0 place-items-center rounded-full bg-background text-xs font-medium text-primary"
              >
                {index + 1}
              </span>
              <p className="pt-0.5 text-sm leading-6">{step}</p>
            </li>
          ))}
        </ol>
      </DialogContent>
    </Dialog>
  )
}

const guides: Record<string, string[]> = {
  '/hall-of-fame': [
    '낚시와 수집, 친구 돕기 등 각 부문의 상위 5명을 만나요.',
    '아바타를 누르면 좋아요·싫어요와 댓글을 남길 수 있어요. 반응은 같은 퐁이에게 한 번만 집계하고 다시 누르면 취소해요.',
    '각 항목의 집계 기준에서 포함되는 기록을 확인하고, 새로고침으로 최신 순위를 불러와요.',
  ],
  '/port': [
    '조선소에서 구매한 배들이 선착장에서 기다려요.',
    '연료를 채우고 배와 열린 해역을 선택해 출항해요. 앱을 꺼도 조업 시간은 계속 흘러요.',
    '귀항한 배를 누르거나 모두 수확 버튼으로 조업 결과를 받아요. 선택한 해역에서 일반 미끼 확률을 사용해요. 미끼 소모와 낚싯대 효과는 없어요.',
  ],
  '/': [
    '장소 메뉴에서 아쿠아리움·지도·상점 등으로 이동해요.',
    '출석체크로 오늘의 보상을 받고, 알림에서 도착한 소식을 확인해요.',
  ],
  '/collection': [
    '발견한 개체와 아직 만나지 못한 개체를 확인해요.',
    '종류·등급·주 서식지로 찾아보고, 발견한 개체를 눌러 자세히 살펴봐요.',
  ],
  '/storage': [
    '어항 밖에 보관 중인 개체를 검색하고 종류·등급·해역별로 살펴봐요.',
    '개체를 선택해 친구에게 선물하거나 판매할 수 있어요. 어항 배치는 아쿠아리움에서 해요.',
  ],
  '/collection-animation': [
    '포획 기록과 관계없이 모든 개체의 컬러 모습을 확인하는 테스트용 도감이에요.',
    '개체를 누르면 상세 화면에서 유영 애니메이션을 볼 수 있어요. 발견 기록은 바뀌지 않아요.',
  ],
  '/titles': [
    '칭호별 조건과 획득 진행도를 확인해요.',
    '획득한 칭호를 장착하면 내 이름과 함께 보여요. 한 번 획득한 칭호는 계속 보유해요.',
  ],
  '/warehouse': [
    '보유한 미끼와 낚싯대를 확인해요.',
    '사용할 낚싯대를 선택하고 장착해 다음 낚시를 준비해요.',
  ],
  '/shop': [
    '미끼·낚싯대 중 필요한 상품을 골라요.',
    '상품을 눌러 설명과 가격을 확인한 뒤 구매해요.',
  ],
  '/item-shop': [
    '연료와 항해 지도를 구매해요.',
    '연료는 배의 출항에 사용하고 지도는 새로운 해역을 열어줘요.',
    '연료는 하루 최대 5통까지 구매할 수 있고 한국 시간 자정에 초기화돼요.',
  ],
  '/shipyard': [
    '배의 소요 시간·연료 소모량·낚시 횟수를 비교해요.',
    '구매한 배는 내 섬의 항구에서 출항할 수 있어요. 연료는 아이템 상점에서 구매해요.',
  ],
  '/expeditions': [
    '선택한 해역에 꼬마 통발을 설치해요.',
    '미끼는 1~30개까지 넣을 수 있고, 한 개당 10분씩 걸려요.',
    '유인 시간이 끝나면 통발을 수확해요. 포획은 실패할 수도 있어요.',
  ],
  '/savings': [
    '기간과 매일 넣을 골드를 정하고 적금을 시작해요.',
    '납입 시간이 되면 골드를 넣어요. 납입 기한을 놓치지 않도록 확인해 주세요.',
    '만기에는 원금과 보너스를 받아요. 중도에 열면 보너스 없이 원금만 돌려받아요.',
  ],
  '/arcade': [
    '게임을 골라 설명과 참가 조건을 확인해요.',
    '게임 안내에 따라 플레이하고 결과를 확인해요.',
  ],
  '/harbor': [
    '해역을 선택해 설명과 해금 여부를 확인해요.',
    '직접 출항으로 낚시하러 가거나 통발 설치를 선택해요.',
    '잠긴 해역은 상점에서 지도를 구매해 열 수 있어요.',
  ],
  '/friends': [
    '친구 초대에서 내 코드를 복사하거나 친구 코드로 요청을 보내요.',
    '받은 요청에서 친구 요청을 확인하고 응답해요.',
    '친구 옆 아쿠아리움 버튼으로 방문해요. 친구 끊기는 확인 후 처리돼요.',
  ],
  '/notifications': [
    '공지·친구·소식·선물 분류를 골라 도착한 내용을 확인해요.',
    '친구 요청에 응답하거나 도착한 선물을 확인해요.',
    '수확 준비 알림을 누르면 통발 설치에서 결과를 받을 수 있어요.',
  ],
  '/merchant-orders': [
    '매일 한국 시간 자정에 서버 공통 주문 40개가 도착해요. 첫 방문 때 오늘의 주문이 열려요.',
    '물고기·쓰레기·장식물을 모아 선착순으로 납품해요. 한 주문은 한 명만 완료할 수 있어요.',
    '어항에 배치하지 않은 보관함 개체만 사용해요. 선물 보관 중이거나 이미 판매한 개체는 제외돼요.',
    '납품하면 표시된 골드를 즉시 받아요. 개인 납품 횟수 제한 없이 마감 전 주문에 참여할 수 있어요.',
  ],
  '/exchange': [
    '등록된 물건을 살펴보고 원하는 거래를 선택해요.',
    '판매할 물건을 등록하거나 내 거래의 진행 상태를 확인해요.',
  ],
  '/square': [
    '공지에서 섬의 새로운 소식을 확인해요.',
    '건의함에 아이디어를 남기거나 버그 제보로 불편한 점을 알려주세요.',
  ],
}
export const fishingGuide = [
  '미끼와 낚싯대를 준비하고 낚시를 시작해요.',
  '입질이 오면 화면의 안내에 맞춰 조작해요. 낚시는 실패할 수도 있어요.',
  '잡은 개체는 보관함에서 확인하고, 도감에서 발견 기록을 볼 수 있어요.',
]
export function bannerGuide(pathname: string) {
  if(pathname==='/production-shop')return ['시설을 눌러 필요한 재료와 생산 조건을 확인해요.','각 시설은 한 채씩 구매할 수 있어요. 구매한 시설은 내 섬의 연료 생산소에 나타나요.']
  if(pathname==='/production')return ['가동 대기 중인 시설을 눌러 보관함의 재료를 넣어 주세요.','생산은 접속을 종료해도 진행돼요. 완료 후 보관시간 안에 눌러 연료를 받아요.','보관 만료 상태에서 누르면 생산물을 정리하고 다시 가동할 수 있어요.']
  if (pathname.startsWith('/board'))
    return [
      '섬에서 있었던 이야기를 자유롭게 나눠요.',
      '댓글과 답글을 남기고 좋아요·싫어요로 반응할 수 있어요.',
      '내 글과 댓글은 더보기 메뉴에서 수정하거나 삭제해요.',
    ]
  if (pathname.startsWith('/friends/') && pathname.endsWith('/expeditions'))
    return [
      '친구가 어느 해역에 통발을 설치했는지 살펴봐요.',
      '물고기를 유인하면 수확이 10분 빨라져요. 같은 통발에는 한 번만 도울 수 있어요.',
    ]
  if (pathname.startsWith('/friends/'))
    return [
      '친구가 꾸민 아쿠아리움과 바다 친구들을 구경해요.',
      '먹이를 주거나 어항을 닦아 친구의 바다를 돌봐줄 수 있어요.',
    ]
  if (pathname.startsWith('/square/notices'))
    return [
      '공지 목록에서 읽고 싶은 소식을 선택해요.',
      '공지 내용을 확인하고 목록으로 돌아갈 수 있어요.',
    ]
  if (pathname.startsWith('/square/suggestions'))
    return ['다른 이용자의 아이디어를 살펴봐요.', '더 나은 퐁당섬을 위한 제안을 글로 남겨주세요.']
  if (pathname.startsWith('/square/bugs'))
    return [
      '문제가 생긴 화면과 어떤 행동을 했는지 적어주세요.',
      '버그 제보를 남기고 답변이나 처리 소식을 확인해요.',
    ]
  return guides[pathname] ?? guides['/' + pathname.split('/')[1]] ?? guides['/']
}
