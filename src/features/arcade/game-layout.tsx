import type { ComponentPropsWithoutRef, ReactNode } from 'react'

/** Presentation only: each game owns its clock, requests and lifecycle. */
export function GamePanel({
  id,
  hidden = false,
  className = '',
  children,
}: {
  id: string
  hidden?: boolean
  className?: string
  children: ReactNode
}) {
  return (
    <div
      id={`${id}-game-panel`}
      role="tabpanel"
      aria-labelledby={`${id}-game-tab`}
      hidden={hidden}
      className={`${hidden ? 'hidden' : 'flex'} min-h-0 min-w-0 flex-1 flex-col ${className}`}
    >
      {children}
    </div>
  )
}

/** Keep the stage mounted when an overlay changes, especially for canvas games. */
export function GameStage({ children, className = '', ...props }: ComponentPropsWithoutRef<'div'>) {
  return (
    <div {...props} className={`relative min-h-0 flex-1 overflow-hidden ${className}`}>
      {children}
    </div>
  )
}

/** Hide unrevealed decisions without changing the board's available height. */
export function GameActions({
  children,
  revealed = true,
  className = '',
}: {
  children: ReactNode
  revealed?: boolean
  className?: string
}) {
  return (
    <div
      className={`shrink-0 ${className}`}
      inert={!revealed}
      style={revealed ? undefined : { visibility: 'hidden' }}
    >
      {children}
    </div>
  )
}
