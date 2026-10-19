import {appArt} from '@/components/app-art'
const icons={guide:appArt.noticeGuide,update:appArt.noticeUpdate,maintenance:appArt.bugs,event:appArt.noticeEvent}
export function NoticeCategoryIcon({category,className='size-7'}:{category:keyof typeof icons;className?:string}){const Icon=icons[category]??icons.guide;return <Icon className={className}/>}
