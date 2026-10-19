import {Info} from 'lucide-react'
import {Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle,DialogTrigger} from './ui/dialog'

export function BannerInfo({title,steps}:{title:string;steps:string[]}){
 return <Dialog>
  <DialogTrigger aria-label={`${title} 안내`} className="pointer-events-auto inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-white/90 outline-none transition-colors hover:bg-white/15 hover:text-white focus-visible:ring-2 focus-visible:ring-white"><Info aria-hidden="true" className="size-4"/></DialogTrigger>
  <DialogContent className="max-h-[80dvh] max-w-sm gap-4 overflow-y-auto rounded-xl">
   <DialogHeader className="pr-6"><DialogTitle>{title} 이용 안내</DialogTitle><DialogDescription>이곳에서 할 수 있어요</DialogDescription></DialogHeader>
   <ol className="space-y-3">{steps.map((step,index)=><li key={step} className="flex items-start gap-3 rounded-lg bg-secondary/50 p-3"><span aria-hidden="true" className="grid size-6 shrink-0 place-items-center rounded-full bg-background text-xs font-medium text-primary">{index+1}</span><p className="pt-0.5 text-sm leading-6">{step}</p></li>)}</ol>
  </DialogContent>
 </Dialog>
}

const guides:Record<string,string[]>={
 '/':['장소 메뉴에서 아쿠아리움·지도·상점 등으로 이동해요.','출석체크로 오늘의 보상을 받고, 알림에서 도착한 소식을 확인해요.'],
 '/collection':['발견한 개체와 아직 만나지 못한 개체를 확인해요.','종류·등급·주 서식지로 찾아보고, 발견한 개체를 눌러 자세히 살펴봐요.'],
 '/collection-animation':['포획 기록과 관계없이 모든 개체의 컬러 모습을 확인하는 테스트용 도감이에요.','개체를 누르면 상세 화면에서 유영 애니메이션을 볼 수 있어요. 발견 기록은 바뀌지 않아요.'],
 '/titles':['칭호별 조건과 획득 진행도를 확인해요.','획득한 칭호를 장착하면 내 이름과 함께 보여요. 한 번 획득한 칭호는 계속 보유해요.'],
 '/warehouse':['보유한 미끼와 낚싯대를 확인해요.','사용할 낚싯대를 선택하고 장착해 다음 낚시를 준비해요.'],
 '/shop':['미끼·낚싯대·지도 중 필요한 상품을 골라요.','상품을 눌러 설명과 가격을 확인한 뒤 구매해요. 지도는 새로운 해역을 열어줘요.'],
 '/shipyard':['어선별 조업 시간·최소 및 최대 적재량·보너스를 비교해요.','원하는 어선을 구매하면 어선 파견에서 선택할 수 있어요.'],
 '/expeditions':['보유한 어선과 조업할 해역을 선택해요.','미끼 선택에서 어선의 최소·최대 적재량에 맞게 미끼를 실어요.','파견 후 귀항하면 결과를 받아요. 조업은 실패할 수도 있어요.'],
 '/savings':['기간과 매일 넣을 골드를 정하고 적금을 시작해요.','납입 시간이 되면 골드를 넣어요. 납입 기한을 놓치지 않도록 확인해 주세요.','만기에는 원금과 보너스를 받아요. 중도에 열면 보너스 없이 원금만 돌려받아요.'],
 '/arcade':['게임을 골라 설명과 참가 조건을 확인해요.','게임 안내에 따라 플레이하고 결과를 확인해요.'],
 '/harbor':['해역을 선택해 설명과 해금 여부를 확인해요.','직접 출항으로 낚시하러 가거나 어선 파견을 선택해요.','잠긴 해역은 상점에서 지도를 구매해 열 수 있어요.'],
 '/friends':['친구 초대에서 내 코드를 복사하거나 친구 코드로 요청을 보내요.','받은 요청에서 친구 요청을 확인하고 응답해요.','친구 옆 아쿠아리움 버튼으로 방문해요. 친구 끊기는 확인 후 처리돼요.'],
 '/notifications':['공지·친구·소식·선물 분류를 골라 도착한 내용을 확인해요.','친구 요청에 응답하거나 도착한 선물을 확인해요.','귀항 알림을 누르면 어선 파견에서 결과를 받을 수 있어요.'],
 '/exchange':['등록된 물건을 살펴보고 원하는 거래를 선택해요.','판매할 물건을 등록하거나 내 거래의 진행 상태를 확인해요.'],
 '/square':['공지에서 섬의 새로운 소식을 확인해요.','건의함에 아이디어를 남기거나 버그 제보로 불편한 점을 알려주세요.'],
}
export const fishingGuide=['미끼와 낚싯대를 준비하고 낚시를 시작해요.','입질이 오면 화면의 안내에 맞춰 조작해요. 낚시는 실패할 수도 있어요.','잡은 개체는 보관함에서 확인하고, 도감에서 발견 기록을 볼 수 있어요.']
export function bannerGuide(pathname:string){
 if(pathname.startsWith('/friends/')&&pathname.endsWith('/expeditions'))return ['친구의 어선이 어디에서 조업하고 있는지 살펴봐요.','순풍을 보내면 귀항이 10분 빨라져요. 같은 파견에는 한 번만 도울 수 있어요.']
 if(pathname.startsWith('/friends/'))return ['친구가 꾸민 아쿠아리움과 바다 친구들을 구경해요.','먹이를 주거나 어항을 닦아 친구의 바다를 돌봐줄 수 있어요.']
 if(pathname.startsWith('/square/notices'))return ['공지 목록에서 읽고 싶은 소식을 선택해요.','공지 내용을 확인하고 목록으로 돌아갈 수 있어요.']
 if(pathname.startsWith('/square/suggestions'))return ['다른 이용자의 아이디어를 살펴봐요.','더 나은 퐁당섬을 위한 제안을 글로 남겨주세요.']
 if(pathname.startsWith('/square/bugs'))return ['문제가 생긴 화면과 어떤 행동을 했는지 적어주세요.','버그 제보를 남기고 답변이나 처리 소식을 확인해요.']
 return guides[pathname]??guides['/'+pathname.split('/')[1]]??guides['/']
}
