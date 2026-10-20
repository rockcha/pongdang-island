import {Sparkles} from 'lucide-react'

export function NewDiscoveryBadge({className=''}:{className?:string}){
 return <span aria-label="첫 발견" className={`inline-flex w-fit shrink-0 items-center gap-1 rounded-full border border-amber-300/70 bg-[#fff0c9] px-2.5 py-1 text-[10px] font-bold leading-none tracking-[0.12em] text-[#946023] shadow-[0_2px_12px_#e8b34c25] motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-90 ${className}`}><Sparkles aria-hidden="true" className="size-3"/>NEW</span>
}
