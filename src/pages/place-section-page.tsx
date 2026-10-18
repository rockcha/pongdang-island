import {useLocation} from 'react-router'
import { placeSections } from '@/lib/place-sections'
import {MerchantDestinations} from '@/features/exchange/merchant-destinations'
import {PlaceDestinations} from '@/components/place-destinations'
import {squareDestinations} from '@/lib/square-destinations'

export function PlaceSectionPage({section}:{section:keyof typeof placeSections}){
 const place=placeSections[section]
 const {pathname}=useLocation()
 const selected=place.items.find(item=>item.path===pathname)
 if(section==='merchants'&&!selected)return <MerchantDestinations/>
 if(section==='square'&&!selected)return <PlaceDestinations scrollable title="광장" directory="square" items={squareDestinations}/>
 return <section className="space-y-5 py-6">
  {selected?<>
   <div className="flex min-h-52 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border/70 bg-muted/20 px-5 py-10 text-center"><selected.icon className="size-7 text-primary/50" strokeWidth={1.5}/><p className="text-sm font-medium">준비 중이에요</p><p className="max-w-60 text-xs leading-5 text-muted-foreground">{selected.empty}</p></div>
  </>:null}
 </section>
}
