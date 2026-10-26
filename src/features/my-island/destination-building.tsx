import type { Facility } from './island-model'
import { destinationArtwork } from './destination-art'
import { PageObjectArt } from './page-object-art'

export function DestinationBuilding({ facility }: { facility: Facility }) {
  return <PageObjectArt art={destinationArtwork(facility.to ?? '')} />
}
export function ShipyardBuilding() {
  return (
    <g>
      <ellipse cx="48" cy="91" rx="55" ry="10" fill="#476951" opacity=".16" />
      <rect x="0" y="77" width="96" height="17" rx="4" fill="#b3ac94" />
      <path d="M10 92l9-39m55 39-8-39" stroke="#8e8e79" strokeWidth="3" />
      <path d="M4 22h87v49H4Z" fill="#e3d8b7" stroke="#a49a7c" strokeWidth="2" />
      <path d="M-4 23L45-17 99 23v7H-4Z" fill="#86a9b6" stroke="#627f90" strokeWidth="2" />
      <path d="M5 21L45-10 90 21M22 22l23-32 25 32" stroke="#b8d0ce" strokeWidth="2" fill="none" />
      <path d="M16 76V40q30-21 61 0v36Z" fill="#788c87" stroke="#c8bd9a" strokeWidth="3" />
      <path d="M19 39v37m54-37v37" stroke="#eedbb1" strokeWidth="2" />
      <rect
        x="31"
        y="17"
        width="29"
        height="16"
        rx="5"
        fill="#fff1cb"
        stroke="#b9a880"
        strokeWidth="1.4"
      />
      <path d="M37 25h17l-3 5H40Zm8-6v6" fill="#83a7af" stroke="#6f9099" strokeWidth="1.2" />
      <path
        d="M18 57q30-13 58 0l-8 25q-19 12-41 0Z"
        fill="#bd9470"
        stroke="#8d7357"
        strokeWidth="2"
      />
      <path
        d="M20 59q28-12 54 0M25 69q23-9 45 0M29 78q18-6 38 0"
        stroke="#e4bf88"
        strokeWidth="2"
        fill="none"
      />
      <path d="M32 55l5 29m12-32v35m13-32-4 30" stroke="#ebcda0" strokeWidth="2" />
      <path d="M83 72v-45h10" stroke="#a08e6c" strokeWidth="3" fill="none" />
      <path d="M93 27v14q-7 1-3 7" stroke="#747e72" strokeWidth="2" fill="none" />
      <rect x="0" y="68" width="15" height="17" rx="2" fill="#bb9a6d" />
      <path d="M2 73h11M2 80h11" stroke="#e4c695" strokeWidth="2" />
    </g>
  )
}
