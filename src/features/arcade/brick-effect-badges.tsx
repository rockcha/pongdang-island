import type {BrickEffect} from './brick-breaker-model'
import {isItem} from './brick-breaker-model'
import {dropArtwork} from './brick-breaker-artwork'

export function BrickEffectBadges({effects}:{effects:BrickEffect[]}){
 if(!effects.length)return null
 return <div role="list" aria-label="현재 버프와 디버프" className="flex min-h-9 shrink-0 items-center gap-1.5 overflow-x-auto px-3 pb-1 text-white">
  {effects.map(effect=>{
   const label=effect.label+(effect.seconds!==undefined?` · ${effect.seconds}초`:''),asset=dropArtwork[effect.kind]
   return <span role="listitem" key={effect.kind} title={label} aria-label={label} className={`flex shrink-0 items-center gap-1 rounded-lg border px-1.5 py-1 ${isItem(effect.kind)?'border-emerald-200/20 bg-emerald-200/10':'border-rose-200/25 bg-rose-300/15'}`}>
    <img src={asset.preview??asset.src} alt="" className="size-5 object-contain"/>
    <span className="text-[10px] leading-none tabular-nums">{effect.seconds!==undefined?`${effect.seconds}s`:'•'}</span>
   </span>
  })}
 </div>
}
