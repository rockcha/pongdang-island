import {useState} from 'react'
import {pushTitles} from '../../../supabase/functions/_shared/push-presentation'
const examples=[{category:'production',label:'연료',body:'조그만 화덕 · 연료 120개를 챙겨가세요.'},{category:'bait-production',label:'미끼',body:'미끼 30개가 준비됐어요. 받고 낚시하러 가요.'},{category:'expedition',label:'통발',body:'통발의 수확이 준비됐어요. 어떤 친구가 왔는지 확인해 보세요.'},{category:'harbor',label:'귀항',body:'어선이 돌아왔어요. 항구에서 선물을 확인해요.'}]
export function PushPreview(){
 const [category,setCategory]=useState('production')
 const example=examples.find(e=>e.category===category)!
 return <div className="space-y-2.5 rounded-xl border border-border/50 bg-secondary/20 p-3">
  <div className="flex items-center justify-between text-[10px] text-muted-foreground"><span>알림 미리보기</span><span>예시</span></div>
  <div className="flex gap-1" role="group" aria-label="알림 미리보기 종류">{examples.map(e=><button type="button" key={e.category} aria-pressed={category===e.category} onClick={()=>setCategory(e.category)} className={`min-h-9 flex-1 rounded-lg text-[10px] transition-colors ${category===e.category?'bg-background font-semibold text-primary shadow-sm':'text-muted-foreground hover:bg-background/60'}`}>{e.label}</button>)}</div>
  <div className="flex items-start gap-2.5 rounded-2xl border border-border/50 bg-background p-3" aria-label="푸시 알림 예시">
   <img src="/branding/pongi.png" alt="" className="size-11 shrink-0 object-contain"/>
   <div className="min-w-0 flex-1"><div className="flex items-center gap-1 text-[9px] text-muted-foreground"><span className="grid size-4 place-items-center rounded bg-primary"><img src="/notification-icons/push-badge-pongi-v1.png" alt="퐁이 얼굴 알림 배지" className="size-3"/></span><span>퐁당섬</span><span className="ml-auto">지금</span></div><p className="mt-1 text-xs font-semibold leading-5">{pushTitles[category]}</p><p className="mt-0.5 text-[11px] leading-5 text-muted-foreground">{example.body}</p></div>
  </div>
  <p className="text-[9px] leading-4 text-muted-foreground">문구와 수량은 예시예요. 알림 모양은 기기와 브라우저에 따라 달라요.</p>
 </div>
}
