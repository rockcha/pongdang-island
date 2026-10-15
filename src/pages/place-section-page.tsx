import { ArrowLeft,ChevronRight } from 'lucide-react'
import { Link,useLocation } from 'react-router'
import { placeSections } from '@/lib/place-sections'

export function PlaceSectionPage({section}:{section:keyof typeof placeSections}){
 const place=placeSections[section]
 const {pathname}=useLocation()
 const selected=place.items.find(item=>item.path===pathname)
 return <section className="space-y-5 py-6">
  {selected?<>
   <Link to={place.path} className="inline-flex min-h-11 items-center gap-1 text-xs text-muted-foreground hover:text-primary"><ArrowLeft className="size-3.5"/>{place.title}</Link>
   <div className="space-y-1.5"><h2 className="text-lg font-semibold">{selected.title}</h2><p className="text-xs leading-5 text-muted-foreground">{selected.description}</p></div>
   <div className="flex min-h-52 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border/70 bg-muted/20 px-5 py-10 text-center"><selected.icon className="size-7 text-primary/50" strokeWidth={1.5}/><p className="text-sm font-medium">준비 중이에요</p><p className="max-w-60 text-xs leading-5 text-muted-foreground">{selected.empty}</p></div>
  </>:<nav aria-label={`${place.title} 둘러보기`}><ul className="divide-y rounded-2xl border border-border/70 bg-card">{place.items.map(item=><li key={item.path}><Link to={item.path} className="flex min-h-24 items-center gap-3 px-4 py-5 transition-colors hover:bg-muted/40"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/5 text-primary"><item.icon className="size-5" strokeWidth={1.7}/></span><div className="min-w-0 flex-1"><h2 className="text-sm font-semibold">{item.title}</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">{item.description}</p></div><ChevronRight className="size-4 shrink-0 text-muted-foreground/50"/></Link></li>)}</ul></nav>}
 </section>
}
