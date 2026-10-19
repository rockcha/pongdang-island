import {appArt} from '@/components/app-art'

const {bugs:Bug,notices:Megaphone,suggestions:MessageSquare}=appArt



export const placeSections={
 square:{path:'/square',title:'광장',description:'섬의 소식을 나누고, 더 좋은 내일을 만드는 곳',items:[
  {path:'/square/notices',title:'공지사항',description:'퐁당 섬의 새로운 소식과 안내',icon:Megaphone,empty:'섬의 새 소식을 이곳에서 전해드릴게요.'},
  {path:'/square/suggestions',title:'건의함',description:'더 좋은 섬을 위한 생각과 바람',icon:MessageSquare,empty:'여러분의 아이디어를 모을 공간을 준비하고 있어요.'},
  {path:'/square/bugs',title:'버그 제보',description:'불편하거나 이상한 점을 알려주세요',icon:Bug,empty:'발견한 문제를 알려주실 공간을 준비하고 있어요.'},
 ]},
}
