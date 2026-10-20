import { appArt } from '@/components/app-art'

const { gameplay: Gamepad2, ranking: Trophy } = appArt

export type GameTab = 'game' | 'rank'
export function GameTabs({
  id,
  value,
  onChange,
}: {
  id: string
  value: GameTab
  onChange: (value: GameTab) => void
}) {
  return (
    <div
      role="tablist"
      aria-label="게임 메뉴"
      className="segmented-control grid w-full shrink-0 grid-cols-2 gap-0 border-b border-border bg-background"
    >
      {(
        [
          { value: 'game', label: '게임 플레이', icon: Gamepad2 },
          { value: 'rank', label: '랭킹', icon: Trophy },
        ] as const
      ).map((tab) => (
        <button
          key={tab.value}
          id={`${id}-${tab.value}-tab`}
          role="tab"
          aria-selected={value === tab.value}
          aria-controls={`${id}-${tab.value}-panel`}
          tabIndex={value === tab.value ? 0 : -1}
          onKeyDown={(event) => {
            if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
              event.preventDefault()
              const next = tab.value === 'game' ? 'rank' : 'game'
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
