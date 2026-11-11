import { useId, useState } from 'react'

export function PetThoughtBubble({ kind }: { kind: 'hungry' | 'lonely' }) {
  const id = useId(), [expanded, setExpanded] = useState(false)
  const message = kind === 'hungry' ? '배가 고파요' : '함께 있고 싶어요'
  return <div className={`pet-thought ${kind}`} role="status" aria-label="펫의 마음">
    <button className="pet-thought-button" aria-label={message} aria-expanded={expanded} aria-controls={expanded ? id : undefined}
      onClick={() => setExpanded(!expanded)} onBlur={() => setExpanded(false)}
      onKeyDown={event => { if (event.key === 'Escape') setExpanded(false) }}>
      <svg viewBox="0 0 48 48" aria-hidden="true" className="pet-thought-icon">
        <defs>
          <linearGradient id={`${id}-bowl`} x2="0" y2="1"><stop stopColor="#c7d4b7"/><stop offset="1" stopColor="#a3b28f"/></linearGradient>
          <linearGradient id={`${id}-heart`} x2="0" y2="1"><stop stopColor="#edb0b6"/><stop offset="1" stopColor="#d58b98"/></linearGradient>
        </defs>
        {kind === 'hungry' ? <g className="pet-thought-food">
          <g fill="#bd9061" stroke="#a67c51" strokeWidth=".7">
            <ellipse cx="16" cy="23" rx="4" ry="3" transform="rotate(-22 16 23)"/>
            <ellipse cx="25" cy="20" rx="4" ry="3" transform="rotate(15 25 20)"/>
            <ellipse cx="32" cy="23" rx="4" ry="3"/>
            <ellipse className="pet-thought-kibble" cx="21" cy="24" rx="4" ry="3"/>
          </g>
          <path d="m8 25 4 13c6 3 18 3 24 0l4-13Z" fill={`url(#${id}-bowl)`} stroke="#879973" strokeWidth="1.1" strokeLinejoin="round"/>
          <ellipse cx="24" cy="25" rx="16" ry="3.5" fill="#e5e9d8" stroke="#879973" strokeWidth="1.1"/>
          <ellipse cx="24" cy="25" rx="12" ry="1.8" fill="#bc976c"/>
          <path d="M19 33h10" stroke="#f5f5e7" strokeWidth="2" strokeLinecap="round"/>
        </g> : <g className="pet-thought-heart" fill={`url(#${id}-heart)`} stroke="#c47e8b" strokeWidth="1" strokeLinejoin="round">
          <path d="M23 13c-6-9-17-5-17 4 0 8 9 15 17 21l-3-11 5-5-6-5Z"/>
          <path d="M27 12c7-7 16-2 15 6-1 8-9 14-16 20l-2-10 5-6-6-5Z"/>
        </g>}
      </svg>
      <span className="sr-only">{message}</span>
    </button>
    {expanded && <span className="pet-thought-label" id={id}>{message}</span>}
  </div>
}
