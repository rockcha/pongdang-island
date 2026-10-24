type IconProps = { className?: string }

export function CommonSpeciesIcon({ className = 'size-6 shrink-0' }: IconProps) {
  return <svg aria-hidden="true" viewBox="0 0 32 32" fill="none" className={className}>
    <circle cx="16" cy="16" r="12.5" fill="#78C6DA" stroke="#377D91" strokeWidth="1.4"/>
    <path d="m9 5.7 5 1.1 1.7 3.5-2.1 3.1-3.8.4-1.5 3-3.7-1.9.7-5.2ZM20.5 6.6l4.7 3.5 2.3 5.4-4.5 1.2-2-2.8-3 .2-1-3.4ZM17 18l4.7.5 2 3.5-3.3 4.5-4.5 1.5-1.8-4.2.7-3.4Z" fill="#79AC77" stroke="#4A8265" strokeWidth=".8" strokeLinejoin="round"/>
    <path d="M9.5 7.5a10.8 10.8 0 0 1 7-2.3" stroke="#E2F5F4" strokeWidth="1.8" strokeLinecap="round"/>
    <path d="M7 24.8c5.3 5.2 14.8 4.3 18.4-2.4" stroke="#377D91" strokeOpacity=".25" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
}

export function HalloweenIcon({ className = 'size-6 shrink-0' }: IconProps) {
  return <img src="/collection-icons/halloween.svg" alt="" aria-hidden="true" className={className}/>
}
