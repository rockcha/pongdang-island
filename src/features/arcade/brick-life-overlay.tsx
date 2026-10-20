import {Heart,Play} from 'lucide-react'
import {Button} from '@/components/ui/button'

export function BrickLifeOverlay({lives,busy,onContinue}:{lives:number;busy:boolean;onContinue:()=>void}){
 return <div role="status" aria-label="목숨 감소 안내" className="absolute inset-0 z-20 flex items-center justify-center bg-[#14252b]/90 p-6 text-center text-[#fff1dd]">
  <div className="w-full max-w-64 space-y-5">
   <p className="text-xs tracking-widest text-[#e7c19b]/60">잠깐, 숨을 고르고</p>
   <h2 className="text-xl font-medium">목숨 {lives}개 남았습니다</h2>
   <div aria-hidden="true" className="flex items-center justify-center gap-3 text-[#ed9b8d]">
    {[0,1,2].map(i=><Heart key={i} className={`size-9 ${i<lives?'fill-current':'opacity-20'}`}/>)}
   </div>
   <p className="text-sm leading-6 text-[#e7c19b]/75">모은 보상은 그대로예요.<br/>준비되면 다시 도전해요.</p>
   <Button className="min-h-12 w-full rounded-xl bg-[#a67546] text-white hover:bg-[#b78451]" disabled={busy} onClick={onContinue}><Play className="size-4"/>계속하기</Button>
  </div>
 </div>
}
