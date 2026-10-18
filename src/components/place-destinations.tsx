import {LandscapeImage} from './landscape-image'
import {ChevronRight} from 'lucide-react'
import {Link} from 'react-router'

type Destination={path:string;title:string;description:string;thumbnail:string;upcoming?:boolean}
export function PlaceDestinations({title,directory,items,scrollable=false}:{title:string;directory:string;items:Destination[];scrollable?:boolean}){
 return <nav aria-label={`${title} 둘러보기`} className={scrollable?"min-h-0 flex-1 overflow-y-auto overscroll-contain py-3":"py-5"}><ul className="space-y-3">{items.map(item=><li key={item.path} className="group relative flex min-h-36 overflow-hidden rounded-lg border bg-card transition-colors hover:bg-secondary/40 focus-within:outline-2 focus-within:outline-primary">
  <div className="relative w-[36%] shrink-0 overflow-hidden bg-secondary"><LandscapeImage src={`/${directory}/${item.thumbnail}.png`} alt="" width={1024} height={1024} className="absolute inset-0 h-full w-full object-cover"/></div>
  <Link to={item.path} className="flex min-w-0 flex-1 items-center gap-2 p-4 outline-none before:absolute before:inset-0"><div className="min-w-0 flex-1 space-y-2"><h2 className="text-base font-normal">{item.title}</h2><p className="text-xs leading-5 text-muted-foreground">{item.description}</p>{item.upcoming&&<p className="text-[11px] text-muted-foreground">준비 중</p>}</div><ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true"/></Link>
 </li>)}</ul></nav>
}
