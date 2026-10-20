import type { ReactNode } from 'react'

/** A panel inside the existing game dialog, not another modal or a game-state controller. */
export function GameOverlay({
  title,
  eyebrow,
  children,
  actions,
  tone = 'default',
  label,
  role,
}: {
  title: ReactNode
  eyebrow?: ReactNode
  children?: ReactNode
  actions?: ReactNode
  tone?: 'default' | 'ocean'
  label?: string
  role?: 'status' | 'alert'
}) {
  return (
    <div
      role={role}
      aria-label={label}
      className={`absolute inset-0 z-20 flex flex-col items-center overflow-y-auto p-5 text-center ${tone === 'ocean' ? 'bg-[#14252b]/95 text-[#fff1dd]' : 'bg-black/85 text-white'}`}
    >
      <div className="my-auto w-full max-w-64 space-y-5 py-4">
        {eyebrow && <p className="text-xs tracking-widest opacity-60">{eyebrow}</p>}
        <h2 className="text-xl font-medium">{title}</h2>
        {children}
        {actions && <div className="space-y-2 [&_button]:w-full">{actions}</div>}
      </div>
    </div>
  )
}
