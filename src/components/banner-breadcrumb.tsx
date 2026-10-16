import {Link} from 'react-router'

export function BannerBreadcrumb({parent,to,title}:{parent:string;to:string;title:string}){
 return <span className="flex flex-wrap items-center gap-x-1.5 gap-y-1"><Link to={to} className="text-sm text-white/85 hover:text-white">{parent}</Link><span aria-hidden="true" className="text-sm text-white/60">›</span><span className="text-base font-normal">{title}</span></span>
}
