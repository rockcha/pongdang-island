export function JourneyProgress({duration,label='이동 중…'}:{duration?:number;label?:string}){
 return <div className="journey-progress mx-auto w-full max-w-xs px-7 pt-12 pb-2" role="progressbar" aria-label={label} aria-valuetext={label}>
  <div className="relative h-3 rounded-full border border-[#cbb694] bg-[#e9dfce] shadow-[inset_0_1px_3px_#79583b18]">
   <div className="journey-progress-fill absolute inset-y-0 left-0 rounded-full" data-indeterminate={!duration||undefined} style={{animationDuration:duration?`${duration}ms`:undefined}}>
    <div className="absolute inset-0 overflow-hidden rounded-full border-t border-white/60 bg-gradient-to-r from-[#a5c9bf] via-[#7eafa6] to-[#5e958d]"><span className="journey-progress-wave absolute inset-0"/></div>
    <span className="absolute right-0 bottom-0 w-16 translate-x-1/2 pb-1"><img src="/navigation/journey-boat.png" alt="" aria-hidden="true" width={64} height={64} className="journey-progress-boat size-16 object-contain drop-shadow-sm"/></span>
   </div>
  </div>
  <p className="mt-4 text-center text-xs tracking-wide text-[#8b7159]">{label}</p>
 </div>
}
