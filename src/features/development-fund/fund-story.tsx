import {useEffect,useState} from 'react'
import {Moon,Pause,Play,Sun} from 'lucide-react'
import {PongiHeart} from './pongi-heart'
import './fund-story.css'

export function FundStory({active=true}:{active?:boolean}){
 const [slide,setSlide]=useState(0),[paused,setPaused]=useState(false),[hovered,setHovered]=useState(false),[focused,setFocused]=useState(false)
 const [visible,setVisible]=useState(()=>!document.hidden),[reduced,setReduced]=useState(()=>window.matchMedia?.('(prefers-reduced-motion: reduce)').matches??false)
 useEffect(()=>{
  const media=window.matchMedia?.('(prefers-reduced-motion: reduce)'),visibility=()=>setVisible(!document.hidden),motion=()=>setReduced(media?.matches??false)
  document.addEventListener('visibilitychange',visibility);media?.addEventListener('change',motion)
  return()=>{document.removeEventListener('visibilitychange',visibility);media?.removeEventListener('change',motion)}
 },[])
 useEffect(()=>{if(!active||paused||hovered||focused||!visible||reduced)return;const timer=setTimeout(()=>setSlide(s=>(s+1)%2),5000);return()=>clearTimeout(timer)},[active,paused,hovered,focused,visible,reduced,slide])
 return <section aria-label="퐁당섬 후원 이야기" aria-roledescription="슬라이드" className="fund-story text-center" data-active={active&&visible} onPointerEnter={e=>{if(e.pointerType==='mouse')setHovered(true)}} onPointerLeave={()=>setHovered(false)} onFocusCapture={()=>setFocused(true)} onBlurCapture={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node|null))setFocused(false)}}>
  <div className="grid" aria-live={paused||reduced?'polite':'off'}>
   <div role="group" aria-roledescription="슬라이드" aria-label="후원 이야기 2 / 2" aria-hidden={slide!==1} inert={slide!==1} data-visible={slide===1} className="fund-story-slide [grid-area:1/1]">
    <PongiHeart/>
    <h2 className="text-lg font-medium leading-8 tracking-tight text-primary">후원을 통해 퐁당섬의 내일을 응원해주세요.</h2>
    <p className="mt-3 text-xs leading-7 text-muted-foreground">여러분의 따뜻한 응원은 퐁당섬의 발전에 큰 힘이 됩니다.</p>
    <p className="mt-2 text-[10px] text-primary/75">후원은 자유롭게 참여해주세요.</p>
   </div>
   <div role="group" aria-roledescription="슬라이드" aria-label="개발 이야기 1 / 2" aria-hidden={slide!==0} inert={slide!==0} data-visible={slide===0} className="fund-story-slide [grid-area:1/1]">
    <div className="relative mx-auto size-28"><span role="img" aria-label="밤낮으로 노트북을 두드리며 개발하는 퐁이" className="block size-full overflow-hidden"><span aria-hidden="true" className="fund-pongi-developer block size-full"/></span><Sun aria-hidden="true" className="fund-story-sun absolute right-0 top-2 size-4 text-amber-600"/><Moon aria-hidden="true" className="fund-story-moon absolute right-0 top-2 size-4 text-indigo-400"/></div>
    <h2 className="text-lg font-medium leading-8 tracking-tight text-primary">밤낮으로 섬을 지키고 있어요</h2>
    <p className="mt-3 text-xs leading-7 text-muted-foreground">퐁당섬에는 매달 <span className="font-medium text-primary">5만 원의 서버 비용</span>이 발생하고 있어요.</p>
    <p className="mt-1 text-xs leading-7 text-muted-foreground">밤낮을 쪼개며 콘텐츠 개발을 하고 있습니다.</p>
   </div>
  </div>
  <div className="mt-3 flex items-center justify-center gap-0.5">
   {['개발 이야기','후원 이야기'].map((label,i)=><button key={label} type="button" aria-label={label+' 보기'} aria-pressed={slide===i} onClick={()=>setSlide(i)} className="flex size-7 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"><span aria-hidden="true" className={`h-1.5 rounded-full transition-[width,background-color] duration-300 motion-reduce:transition-none ${slide===i?'w-4 bg-primary/75':'w-1.5 bg-primary/20'}`}/></button>)}
   {!reduced&&<button type="button" aria-label={paused?'슬라이드 자동 전환 재생':'슬라이드 자동 전환 일시정지'} aria-pressed={paused} onClick={()=>setPaused(p=>!p)} className="flex size-7 items-center justify-center rounded-full text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring">{paused?<Play className="size-3"/>:<Pause className="size-3"/>}</button>}
  </div>
 </section>
}
