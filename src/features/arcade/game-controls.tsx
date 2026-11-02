import { appArt } from '@/components/app-art'
import type {ComponentType} from 'react'

const { gameplay: Gamepad2, ranking: Trophy } = appArt

export type GameTab = 'game' | 'rank'
type MenuTab<T extends string>={value:T;label:string;icon:ComponentType<{className?:string}>}
export function GameTabs({
  id,
  value,
  onChange,
  secondaryLabel='랭킹',
  secondaryIcon=Trophy,
}: {
  id: string
  value: GameTab
  onChange: (value: GameTab) => void
  secondaryLabel?:string
  secondaryIcon?:ComponentType<{className?:string}>
}) {
  return <GameMenuTabs id={id} value={value} onChange={onChange} tabs={[
    {value:'game',label:'게임 플레이',icon:Gamepad2},
    {value:'rank',label:secondaryLabel,icon:secondaryIcon},
  ]}/>
}

export function GameMenuTabs<T extends string>({id,value,onChange,tabs}:{id:string;value:T;onChange:(value:T)=>void;tabs:readonly MenuTab<T>[]}){
  return (
    <div
      role="tablist"
      aria-label="게임 메뉴"
      className="segmented-control grid w-full shrink-0 gap-0 border-b border-border bg-background"
      style={{gridTemplateColumns:`repeat(${tabs.length},minmax(0,1fr))`}}
    >
      {tabs.map((tab,index) => (
        <button
          key={tab.value}
          id={`${id}-${tab.value}-tab`}
          role="tab"
          aria-selected={value === tab.value}
          aria-controls={`${id}-${tab.value}-panel`}
          tabIndex={value === tab.value ? 0 : -1}
          onKeyDown={(event) => {
            if (['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) {
              event.preventDefault()
              const next = tabs[event.key==='Home'?0:event.key==='End'?tabs.length-1:(index+(event.key==='ArrowLeft'?-1:1)+tabs.length)%tabs.length].value
              onChange(next)
              document.getElementById(`${id}-${next}-tab`)?.focus()
            }
          }}
          onClick={() => onChange(tab.value)}
          className={`flex min-h-12 min-w-0 items-center justify-center gap-2 rounded-none text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${value === tab.value ? 'bg-secondary text-primary' : 'text-muted-foreground hover:bg-card/60'}`}
        >
          <tab.icon className="size-7" aria-hidden="true" />
          {tab.label}
        </button>
      ))}
    </div>
  )
}

export { GameStartOverlay } from './game-start-overlay'
