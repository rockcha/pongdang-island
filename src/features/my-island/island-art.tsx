import {gardenKinds} from './garden-decoration-catalog'
import {GardenDecoration} from './garden-decoration'
import {WaterwayDecoration} from './waterway-decoration'
import {
  FuelProductionFacility,
  BaitProductionFacility,
  PersonalBaitWorkshop,
} from './production-facility-art'
import { artGeometry } from './island-art-sizing'
import { HarborBuilding } from './harbor-building'
import { DestinationBuilding, ShipyardBuilding } from './destination-building'
import { BookPile, StorageChest, Lighthouse } from './landmark-art'
import { ActivityLandmark } from './activity-landmarks'
import type { Facility } from './island-model'
import { canRotate } from './island-model'
import { RotatedFacilityArt } from './rotated-facility-art'
export function Building({ f, rotation = 0,label,connections }: { f: Facility; rotation?: number;label?:string;connections?:{north:boolean;east:boolean;south:boolean;west:boolean} }) {
  rotation=canRotate(f.id)?rotation:0
  if(gardenKinds.has(f.kind))return <GardenDecoration f={f} rotation={rotation} label={label} connections={connections}/>
  if(['bridge','stepping-stones','reeds'].includes(f.kind))return <WaterwayDecoration f={f} rotation={rotation}/>
  if (rotation && canRotate(f.id)) return <RotatedFacilityArt f={f} rotation={rotation} />
  const { w, h, sx, sy, x, y } = artGeometry(f)
  return (
    <g data-art-direction="0" transform={`translate(${x} ${y}) scale(${sx} ${sy})`}>
      <NativeBuilding f={{ ...f, w, h }} />
    </g>
  )
}
function NativeBuilding({ f }: { f: Facility }) {
  if (f.kind === 'rubber-duck')
    return (
      <g>
        <ellipse cx="16" cy="29" rx="14" ry="3" fill="#6a865c" opacity=".18" />
        <path
          d="M9 17Q4 19 2 14q-3 12 10 15 15 3 19-8l-7-7Z"
          fill="#eac45e"
          stroke="#bd9b52"
          strokeWidth="1"
          strokeLinejoin="round"
        />
        <ellipse cx="16" cy="23" rx="10" ry="6" fill="#f1ce72" />
        <circle cx="22" cy="11" r="8" fill="#f3d479" stroke="#c3a35b" strokeWidth="1" />
        <path d="M29 12q7-1 7 2-1 3-8 2Z" fill="#dc9c5a" stroke="#bc8550" strokeWidth=".8" />
        <circle cx="25" cy="10" r="1.6" fill="#555442" />
        <circle cx="25.5" cy="9.5" r=".5" fill="#fff8dc" />
        <ellipse cx="24" cy="14" rx="2" ry="1.2" fill="#e6ad70" opacity=".65" />
        <path
          d="M12 21q8-6 10 1-2 6-10 2"
          fill="#e8bb56"
          stroke="#d3ac52"
          strokeWidth=".9"
          strokeLinecap="round"
        />
        <path
          d="M18 6q3-2 5-1m-14 17 2-2"
          fill="none"
          stroke="#fff0b1"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </g>
    )
  if (
    [
      'title-flag',
      'relic-case',
      'map-table',
      'notice-board',
      'community-board',
      'gramophone',
      'shell-safe',
      'arcade-cabinet',
    ].includes(f.kind)
  )
    return <ActivityLandmark facility={f} />
  if (f.kind === 'books') return <BookPile />
  if (f.kind === 'stash') return <StorageChest />
  if (f.kind === 'lighthouse') return <Lighthouse />
  if (f.kind === 'destination') return <DestinationBuilding facility={f} />
  if (f.kind === 'shipyard') return <ShipyardBuilding />
  const w = f.w * 32,
    h = f.h * 32
  if (f.kind === 'fuel') return <FuelProductionFacility />
  if (f.kind === 'bait') return <BaitProductionFacility />
  if (f.kind === 'workshop') return <PersonalBaitWorkshop />
  if (f.kind === 'aquarium')
    return (
      <g>
        <ellipse cx="48" cy="93" rx="57" ry="12" fill="#355f57" opacity=".18" />
        <rect x="-3" y="81" width="102" height="13" rx="5" fill="#d1c6a1" />
        <path d="M2 85h92M7 90h82" stroke="#f9edd0" strokeWidth="2" />
        <rect
          x="1"
          y="9"
          width="94"
          height="75"
          rx="12"
          fill="#f4e8c9"
          stroke="#a1b4a0"
          strokeWidth="2"
        />
        <path
          d="M-6 14Q-2-10 48-28 98-10 102 14Z"
          fill="#70b6b3"
          stroke="#4d8f91"
          strokeWidth="2"
        />
        <path d="M3 9Q7-8 48-22 88-8 93 9Z" fill="#a3d5c8" />
        <path
          d="M48-22V10M22 9Q25-8 48-22M74 9Q71-8 48-22"
          fill="none"
          stroke="#e9f7dc"
          strokeWidth="2"
        />
        <path d="M-6 14h108v7H-6" fill="#528f8b" />
        <path d="M-2 15h100" stroke="#d6ecce" strokeWidth="2" />
        <g transform="translate(48 -28)">
          <path
            d="M-13-7Q0-22 14-7 0 8-13-7l-10-7V0Z"
            fill="#f2d48b"
            stroke="#be9b62"
            strokeWidth="1.5"
          />
          <circle cx="8" cy="-9" r="1.5" fill="#597365" />
        </g>
        <rect
          x="8"
          y="28"
          width="80"
          height="40"
          rx="10"
          fill="#5eaaa9"
          stroke="#83b3a3"
          strokeWidth="2"
        />
        <path d="M10 37q13-5 26 0t26 0t24 0" fill="none" stroke="#c9edda" strokeWidth="2" />
        <path
          d="M19 58q-5-10 1-16m6 18q5-12 0-16m46 17q-3-10 2-16"
          fill="none"
          stroke="#98c992"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path d="M29 47q11-11 23 0-12 13-23 0l-9-6v12Z" fill="#f5d28e" />
        <circle cx="46" cy="46" r="1.3" fill="#617b70" />
        <path d="M59 54q7-8 15 0-8 8-15 0l-6-4v8Z" fill="#edb5a2" />
        <circle cx="70" cy="53" r="1" fill="#617b70" />
        <path d="M12 32l15-2-13 29m39-28 10-1-8 30" fill="#e4f5dc" opacity=".2" />
        <rect
          x="34"
          y="66"
          width="28"
          height="21"
          rx="9"
          fill="#528e87"
          stroke="#fcf1d0"
          strokeWidth="3"
        />
        <path d="M48 69v17" stroke="#d6e6c5" strokeWidth="1.5" />
        <circle cx="44" cy="79" r="1.5" fill="#f3d596" />
        <circle cx="52" cy="79" r="1.5" fill="#f3d596" />
        {[5, 75].map((x) => (
          <g key={x} transform={`translate(${x} 76)`}>
            <path d="M0 0h16l-2 12H2Z" fill="#bc9775" />
            <ellipse cx="8" cy="0" rx="10" ry="5" fill="#86aa75" />
            <circle cx="3" cy="-3" r="3" fill="#edbea9" />
            <circle cx="11" cy="-4" r="3" fill="#f8e1a3" />
          </g>
        ))}
      </g>
    )
  if (f.kind === 'shop')
    return (
      <g>
        <ellipse cx="48" cy="92" rx="56" ry="11" fill="#355f57" opacity=".17" />
        <rect x="0" y="79" width="96" height="14" rx="5" fill="#c4b798" />
        <rect
          x="3"
          y="7"
          width="90"
          height="76"
          rx="7"
          fill="#f1dfb8"
          stroke="#aa9472"
          strokeWidth="2"
        />
        <path d="M-6 13L48-24 102 13v9H-6Z" fill="#d79477" stroke="#a66d55" strokeWidth="2" />
        <path d="M5 12L48-17 91 12" fill="none" stroke="#efbea0" strokeWidth="3" />
        <rect
          x="29"
          y="5"
          width="38"
          height="17"
          rx="6"
          fill="#fff1cd"
          stroke="#ba9568"
          strokeWidth="2"
        />
        <path d="M39 13q7-8 15 0-8 8-15 0l-5-4v8Z" fill="#6e9d91" />
        <rect
          x="13"
          y="34"
          width="40"
          height="29"
          rx="5"
          fill="#83b4aa"
          stroke="#c9b38a"
          strokeWidth="3"
        />
        <path d="M33 35v27M15 48h36" stroke="#f7e5bb" strokeWidth="2" />
        <rect
          x="62"
          y="34"
          width="22"
          height="50"
          rx="4"
          fill="#8f9977"
          stroke="#c7b18a"
          strokeWidth="2"
        />
        <rect x="66" y="39" width="14" height="20" rx="2" fill="#b9d4b9" />
        <circle cx="77" cy="68" r="2" fill="#f9db91" />
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <path
            key={i}
            d={`M${8 + i * 14} 24h14l3 13q-9 7-17 0Z`}
            fill={i % 2 ? '#fff0ce' : '#8faa8b'}
            stroke="#b2b991"
            strokeWidth=".5"
          />
        ))}
        <rect x="9" y="69" width="44" height="16" rx="3" fill="#bf9462" />
        <path d="M12 76h38" stroke="#e0be88" strokeWidth="2" />
        <path d="M15 68l3-20m9 20 3-18m9 18 3-20" stroke="#827956" strokeWidth="2" />
        <circle cx="16" cy="57" r="3" fill="#e4a48a" />
        <circle cx="28" cy="57" r="3" fill="#f3d08a" />
      </g>
    )
  if (f.kind === 'tree' || f.kind === 'pine')
    return (
      <g>
        <ellipse cx="32" cy="55" rx="28" ry="10" fill="#48664d" opacity=".2" />
        <path d="M28 20h8v38h-8" fill="#9c7b53" />
        {f.kind === 'tree' ? (
          <>
            <circle cx="32" cy="10" r="27" fill="#63885c" />
            <circle cx="20" cy="2" r="21" fill={f.color} />
            <circle cx="39" cy="-7" r="22" fill="#92b77b" />
            <circle cx="29" cy="-15" r="12" fill="#b0c98d" />
          </>
        ) : (
          <>
            <path d="M0 42L32-26 64 42Z" fill="#507967" />
            <path d="M5 24L32-38 59 24Z" fill={f.color} />
            <path d="M12 6L32-47 52 6Z" fill="#83ab8a" />
          </>
        )}
      </g>
    )
  if (f.kind === 'flowers')
    return (
      <g>
        <rect x="0" y="12" width="64" height="20" rx="9" fill="#ab8d60" />
        <rect x="3" y="12" width="58" height="13" rx="6" fill="#7b9862" />
        {[10, 23, 36, 51].map((x, i) => (
          <g key={x} transform={`translate(${x} ${i % 2 ? 8 : 14})`}>
            <path d="M0 0v12" stroke="#64835b" strokeWidth="2" />
            {[0, 1, 2, 3, 4].map((n) => (
              <circle
                key={n}
                cx={Math.cos(n * 1.26) * 5}
                cy={Math.sin(n * 1.26) * 5}
                r="4"
                fill={i % 2 ? '#fff0bb' : f.color}
              />
            ))}
            <circle r="3" fill="#eac36f" />
          </g>
        ))}
      </g>
    )
  if (f.kind === 'bench')
    return (
      <g>
        <ellipse cx="32" cy="26" rx="33" ry="7" fill="#48664d" opacity=".16" />
        <path d="M7 8v24m48-24v24" stroke="#637568" strokeWidth="5" />
        <rect
          x="0"
          y="-8"
          width="64"
          height="17"
          rx="3"
          fill={f.color}
          stroke="#95744b"
          strokeWidth="2"
        />
        <path d="M0 0h64" stroke="#e2bc86" strokeWidth="2" />
        <rect x="0" y="13" width="64" height="9" rx="2" fill="#d2ab76" />
      </g>
    )
  if (f.kind === 'lamp')
    return (
      <g>
        <ellipse cx="16" cy="29" rx="14" ry="5" fill="#48664d" opacity=".18" />
        <path d="M16-25v53M8 29h16" stroke="#66766b" strokeWidth="5" />
        <rect
          x="5"
          y="-48"
          width="22"
          height="25"
          rx="5"
          fill="#fff0b2"
          stroke="#6d7b66"
          strokeWidth="3"
        />
        <path d="M1-47l15-11 15 11Z" fill="#6d7b66" />
        <path d="M16-45v20" stroke="#d0b571" strokeWidth="2" />
      </g>
    )
  if (f.kind === 'pond')
    return (
      <g>
        <ellipse cx="48" cy="34" rx="48" ry="29" fill="#b8b59a" />
        <ellipse cx="48" cy="30" rx="43" ry="25" fill="#e7ddbb" />
        <ellipse cx="48" cy="30" rx="37" ry="20" fill={f.color} />
        <path d="M21 28q10 5 20 0m9 12q10 5 20 0" fill="none" stroke="#c6e3d6" strokeWidth="2" />
        <ellipse cx="65" cy="23" rx="9" ry="5" fill="#91b078" />
        <circle cx="67" cy="19" r="4" fill="#ebaca4" />
      </g>
    )
  if (f.kind === 'mail')
    return (
      <g>
        <ellipse cx="16" cy="28" rx="15" ry="6" fill="#294f3a" opacity=".16" />
        <path d="M14 8h5v23h-5" fill="#946d49" />
        <path
          d="M2 3Q2-8 15-8h6q10 0 10 11v12H2Z"
          fill={f.color}
          stroke="#885947"
          strokeWidth="2"
        />
        <path d="M7 4h19M24-7v-9h8v5h-7" fill="none" stroke="#fff1d5" strokeWidth="3" />
        <rect x="9" y="7" width="12" height="3" rx="1" fill="#815542" />
      </g>
    )
  if (f.kind === 'dock') return <HarborBuilding />

  return (
    <g>
      <ellipse cx={w / 2} cy={h - 4} rx={w / 2 + 7} ry="13" fill="#32513c" opacity=".17" />
      <rect
        x="2"
        y="8"
        width={w - 4}
        height={h - 12}
        rx="7"
        fill="#d9c4a0"
        stroke="#857358"
        strokeWidth="2"
      />
      <rect x="8" y="13" width={w - 16} height={h - 23} rx="3" fill="#f2dfb8" />
      {
        <>
          <path
            d={`M-7 16L${w / 2} -13 ${w + 7} 16v9H-7Z`}
            fill={f.color}
            stroke="#775c48"
            strokeWidth="2"
          />
          {[12, 30, 48, 66, 84].map((x) => (
            <path key={x} d={`M${x} 14l10-11`} stroke="#fff3d2" opacity=".25" strokeWidth="3" />
          ))}
          <rect x="35" y={h - 33} width="25" height="29" rx="3" fill="#8b7152" />
          <path d={`M47 ${h - 32}v27`} stroke="#cfb28a" strokeWidth="2" />
          <rect
            x="12"
            y="30"
            width="16"
            height="17"
            rx="2"
            fill="#88b9b0"
            stroke="#927754"
            strokeWidth="2"
          />
          <path d="M20 30v17M12 38h16" stroke="#f4deb2" strokeWidth="2" />
          {f.kind === 'fuel' && (
            <>
              <rect
                x="64"
                y="-25"
                width="17"
                height="40"
                fill="#9b8773"
                stroke="#716658"
                strokeWidth="2"
              />
              <path d="M61-25h23v6H61" fill="#c6b49a" />
              <circle cx="73" cy="-38" r="8" fill="#fff5db" opacity=".7" />
              <circle cx="79" cy="-53" r="11" fill="#fff5db" opacity=".4" />
              <rect x="66" y="39" width="20" height="29" rx="4" fill="#879b81" />
              <path d="M70 44h12M70 62h12" stroke="#c9d1a7" strokeWidth="3" />
            </>
          )}
          {f.kind === 'bait' && (
            <>
              <rect x="66" y="34" width="24" height="24" rx="4" fill="#9a7754" />
              <path d="M69 39h18M69 47h18" stroke="#c1a476" strokeWidth="3" />
              <path d="M74 31q-7-13 3-12t1-12" fill="none" stroke="#dc9b89" strokeWidth="4" />
            </>
          )}
          {f.kind === 'warehouse' && (
            <>
              <rect
                x="65"
                y="35"
                width="24"
                height="24"
                fill="#bf945e"
                stroke="#80643f"
                strokeWidth="2"
              />
              <path d="M66 36l22 22m0-22L66 58" stroke="#e1bd82" strokeWidth="3" />
            </>
          )}
        </>
      }
    </g>
  )
}
