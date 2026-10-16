import {placeSections} from './place-sections'

const artwork:Record<string,{thumbnail:string;banner:string;bannerTitle:string;description:string;upcoming?:boolean}>={
 '/square/notices':{thumbnail:'notice-thumbnail',banner:'square-notices',bannerTitle:'공지',description:'게시판에서 만나는 퐁당 섬의 새 소식'},
 '/square/suggestions':{thumbnail:'suggestion-thumbnail',banner:'square-suggestions',bannerTitle:'건의함',description:'더 좋은 섬을 위한 생각과 바람을 나눠요',upcoming:true},
 '/square/bugs':{thumbnail:'bug-thumbnail',banner:'square-bugs',bannerTitle:'버그 제보',description:'불편하거나 이상한 점을 알려주세요',upcoming:true},
}
export const squareDestinations=placeSections.square.items.map(item=>({...item,...artwork[item.path]}))
