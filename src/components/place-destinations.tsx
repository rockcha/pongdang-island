import {ChevronRight} from 'lucide-react'
import {Link} from 'react-router'

type Destination={path:string;title:string;description:string;thumbnail:string;upcoming?:boolean}
export function PlaceDestinations({title,directory,items}:{title:string;directory:string;items:Destination[]}){
 return <nav aria-label={`${title} 둘러보기`} className="py-5"><ul className="space-y-3">{items.map(item=><li key={item.path}><Link to={item.path} className="group flex min-h-36 overflow-hidden rounded-lg border bg-card transition-colors hover:bg-secondary/40 focus-visible:outline-2 focus-visible:outline-primary">
  <div className="relative w-[36%] shrink-0 overflow-hidden bg-secondary"><img src={`/${directory}/${item.thumbnail}.png`} alt="" width={1024} height={1024} className="absolute inset-0 h-full w-full object-cover"/></div>
  <div className="flex min-w-0 flex-1 items-center gap-2 p-4"><div className="min-w-0 flex-1 space-y-2"><h2 className="text-base font-normal">{item.title}</h2><p className="text-xs leading-5 text-muted-foreground">{item.description}</p>{item.upcoming&&<p className="text-[11px] text-muted-foreground">준비 중</p>}</div><ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true"/></div>
 </Link></li>)}</ul></nav>
}
