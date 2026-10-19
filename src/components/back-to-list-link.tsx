import {Link} from 'react-router'
import {appArt} from './app-art'

export function BackToListLink({to,banner=true}:{to:string;banner?:boolean}){
 return <Link to={to} className={banner?'absolute right-4 top-4 z-10 inline-flex min-h-11 items-center gap-1.5 rounded-full border border-white/40 bg-black/25 py-1 pl-2 pr-3 text-xs text-white backdrop-blur-sm hover:bg-black/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white':'inline-flex min-h-11 items-center gap-2 text-sm text-primary underline underline-offset-4'}><appArt.backToList className="size-7"/><span>목록으로</span></Link>
}
