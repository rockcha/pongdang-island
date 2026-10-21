import {Link} from 'react-router'
import {ChevronLeft} from 'lucide-react'

export function BackToListLink({to,banner=true}:{to:string;banner?:boolean}){
 return <Link to={to} className={banner?'absolute right-4 top-4 z-10 inline-flex min-h-11 items-center gap-1 rounded-sm bg-[#995e36] px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-[#804c2b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#995e36]':'inline-flex min-h-11 items-center gap-2 text-sm text-primary underline underline-offset-4'}><ChevronLeft aria-hidden="true" className="size-3.5 shrink-0"/><span>목록으로</span></Link>
}
