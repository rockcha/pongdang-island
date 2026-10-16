import { Bug,Gavel,Handshake,Megaphone,MessageSquare,Store } from 'lucide-react'

export const placeSections={
 square:{path:'/square',title:'광장',description:'섬의 소식을 나누고, 더 좋은 내일을 만드는 곳',items:[
  {path:'/square/notices',title:'공지사항',description:'퐁당 섬의 새로운 소식과 안내',icon:Megaphone,empty:'섬의 새 소식을 이곳에서 전해드릴게요.'},
  {path:'/square/suggestions',title:'건의함',description:'더 좋은 섬을 위한 생각과 바람',icon:MessageSquare,empty:'여러분의 아이디어를 모을 공간을 준비하고 있어요.'},
  {path:'/square/bugs',title:'버그 제보',description:'불편하거나 이상한 점을 알려주세요',icon:Bug,empty:'발견한 문제를 알려주실 공간을 준비하고 있어요.'},
 ]},
 merchants:{path:'/merchant-street',title:'상인거리',description:'소중한 물건이 새로운 주인을 만나는 곳',items:[
  {path:'/shop',title:'상점',description:'작은 물건을 사고파는 곳',icon:Store,empty:''},
  {path:'/merchant-street/exchange',title:'거래소',description:'보상을 맡기고 필요한 개체와 교환해요',icon:Handshake,empty:''},
  {path:'/merchant-street/auctions',title:'경매소',description:'특별한 물건의 가치를 발견하는 곳',icon:Gavel,empty:'특별한 물건을 만날 경매를 준비하고 있어요.'},
 ]},
}
