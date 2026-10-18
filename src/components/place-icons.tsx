import type { SVGProps } from 'react'

const outline = {viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:1.8,strokeLinecap:'round',strokeLinejoin:'round','aria-hidden':true} as const

export function RemoveFriendIcon(props:SVGProps<SVGSVGElement>) {
  return <svg {...outline} {...props}><circle cx="9" cy="7" r="3"/><path d="M3 20v-2a6 6 0 0 1 10-4.5M16 4a3 3 0 0 1 0 6M17 15l5 5m0-5-5 5"/></svg>
}

export function AquariumIcon(props:SVGProps<SVGSVGElement>) {
  return <svg {...outline} {...props}><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 8c2-1.5 4 1.5 6 0s4 1.5 6 0 4 1.5 6 0M5 20v1m14-1v1M7 17v-4m0 2-2-2m2 3 2-2M11 17h6"/><circle cx="16" cy="12" r="1"/></svg>
}

export function MerchantStreetIcon(props:SVGProps<SVGSVGElement>) {
  return <svg {...outline} {...props}><path d="m3 9 2-5h14l2 5M3 9v2a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0V9ZM9 9l1-5m5 5-1-5M5 14v6h14v-6M10 20v-5h4v5M3 20h18"/></svg>
}

export function PlazaIcon(props:SVGProps<SVGSVGElement>) {
  return <svg {...outline} {...props}><path d="M8 20V7l4-4 4 4v13M3 20V11h5m8 0h5v9M2 20h20M10 20v-4h4v4M5 14v2m14-2v2"/><circle cx="12" cy="10" r="2"/><path d="M12 9v1h1"/></svg>
}
