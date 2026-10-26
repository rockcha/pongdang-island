import type { Facility } from './island-model'
import { destinationArtwork } from './destination-art'

type View = { f: Facility; rear: boolean; side: boolean; east: boolean }
const cream = '#efe1bd',
  wood = '#bc9a70'
function Ground() {
  return <ellipse cx="48" cy="92" rx="48" ry="8" fill="#476951" opacity=".16" />
}
function Plinth() {
  return (
    <>
      <Ground />
      <rect x="0" y="80" width="96" height="12" rx="5" fill="#c9bd9b" />
      <path d="M5 84h86" stroke="#eee0ba" strokeWidth="2" />
    </>
  )
}
function Crate({ x = 8, y = 62 }: { x?: number; y?: number }) {
  return (
    <g>
      <rect
        x={x}
        y={y}
        width="23"
        height="23"
        rx="2"
        fill={wood}
        stroke="#9d825b"
        strokeWidth="1.5"
      />
      <path d={`M${x + 2} ${y + 3}l19 17m0-17-19 17`} stroke="#e3c99a" strokeWidth="2" />
    </g>
  )
}
function Window({ x, y, w = 18 }: { x: number; y: number; w?: number }) {
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height="21"
        rx="3"
        fill="#9cbfb1"
        stroke="#b6a37f"
        strokeWidth="2"
      />
      <path
        d={`M${x + w / 2} ${y + 1}v19M${x + 1} ${y + 10}h${w - 2}`}
        stroke="#f3e8c7"
        strokeWidth="1.5"
      />
    </g>
  )
}
function BuildingView({ f, rear, side, east }: View) {
  const aquarium = f.kind === 'aquarium',
    shipyard = f.kind === 'shipyard',
    warehouse = f.kind === 'warehouse'
  const left = side ? 18 : 4,
    width = side ? 60 : 88
  const roof = f.to === '/profile' ? '#bfa18b' : f.color
  return (
    <g>
      <Plinth />
      <rect
        x={left}
        y="14"
        width={width}
        height="68"
        rx="5"
        fill={warehouse ? '#c8b18c' : cream}
        stroke="#ac9d7a"
        strokeWidth="1.5"
      />
      {aquarium ? (
        <>
          <path
            d={`M${left - 5} 17Q${left} -17 48-28Q${left + width} -17 ${left + width + 5} 17Z`}
            fill="#7bb7b2"
            stroke="#5c9894"
            strokeWidth="2"
          />
          <path
            d="M48-26v40m-27 0q0-22 27-40 27 18 27 40"
            fill="none"
            stroke="#c5e0c9"
            strokeWidth="2"
          />
          <rect
            x={left + 7}
            y="31"
            width={width - 14}
            height="30"
            rx="6"
            fill="#94c4b7"
            stroke="#79a798"
            strokeWidth="2"
          />
          <path d={`M${left + 10} 47h${width - 20}`} stroke="#c8e5cf" strokeWidth="2" />
          <rect x={east ? 65 : 9} y="65" width="21" height="17" rx="3" fill="#8da391" />
          <path d={`M${east ? 68 : 12} 70h15m-15 5h15`} stroke="#d5d8b3" strokeWidth="2" />
        </>
      ) : (
        <>
          <path
            d={`M${left - 7} 19 48-14 ${left + width + 7} 19v8H${left - 7}Z`}
            fill={roof}
            stroke="#879580"
            strokeWidth="1.8"
          />
          <path
            d={`M${left + 1} 17 48-7 ${left + width - 1} 17`}
            fill="none"
            stroke="#e6dfbc"
            strokeWidth="2"
            opacity=".6"
          />
          {warehouse ? (
            <>
              {[32, 44, 56, 68].map((y) => (
                <path
                  key={y}
                  d={`M${left + 2} ${y}h${width - 4}`}
                  stroke="#aa9671"
                  strokeWidth="1.4"
                />
              ))}
              <Crate x={rear ? 35 : east ? 13 : 61} y={59} />
            </>
          ) : (
            <>
              <Window x={left + 9} y={36} />
              {rear && <Window x={62} y={36} />}
              <path
                d={`M${east ? 68 : 18} 27v43h12v12`}
                fill="none"
                stroke="#aaa88a"
                strokeWidth="3"
              />
            </>
          )}
        </>
      )}
      {shipyard && (
        <>
          <path d="M22 73q26 24 53 0Z" fill="#c59d6d" stroke="#9b7f5b" strokeWidth="1.5" />
          <path d="M48 65v23m-17-13 4 8m26-8-3 8" stroke="#e7ce9d" strokeWidth="2" />
        </>
      )}
      {rear && !aquarium && !warehouse && (
        <>
          <rect x="38" y="62" width="19" height="20" rx="3" fill="#a9ac8c" />
          <path d="M42 68h11m-11 5h11" stroke="#d7d7b1" strokeWidth="2" />
        </>
      )}
      {side && <path d={`M${east ? left : left + width} 26v55`} stroke="#d0c3a0" strokeWidth="3" />}
    </g>
  )
}
function EquipmentView({ f, rear, side, east }: View) {
  if (f.kind === 'workshop')
    return (
      <g>
        <Plinth />
        <path d="M9 80V0h78v80" stroke="#9c9098" strokeWidth="4" fill="none" />
        <rect
          x="9"
          y="5"
          width="78"
          height="39"
          rx="3"
          fill="#b9b1c2"
          stroke="#958a9f"
          strokeWidth="2"
        />
        {[21, 38, 55, 72].map((x) => (
          <path key={x} d={`M${x} 8v33`} stroke="#d2c5d0" strokeWidth="2" />
        ))}
        <path d="M10 66h77m-70 0v19m63-19v19" stroke={wood} strokeWidth="7" />
        <rect
          x={east ? 57 : 12}
          y="49"
          width="28"
          height="13"
          rx="3"
          fill="#aa9ab8"
          stroke="#8f819c"
          strokeWidth="1.5"
        />
        {!rear && (
          <>
            <path d={`M${east ? 14 : 67} 49l9-17`} stroke="#968064" strokeWidth="3" />
            <ellipse cx={east ? 22 : 73} cy="55" rx="13" ry="5" fill="#e1cda5" />
          </>
        )}
        <Crate x={rear ? 36 : east ? 13 : 59} />
      </g>
    )
  const fuel = f.kind === 'fuel',
    x = side ? (east ? 16 : 46) : 18
  return (
    <g>
      <Plinth />
      <path d={`M${x + 12} 13V-6h38v29`} fill="none" stroke="#829785" strokeWidth="7" />
      <path d={`M${x + 12} 13V-6h38v29`} fill="none" stroke="#c5cdb0" strokeWidth="2" />
      <rect
        x={x}
        y="12"
        width={fuel ? 39 : 30}
        height="58"
        rx="14"
        fill={fuel ? '#aab698' : '#b4cfad'}
        stroke="#7c9780"
        strokeWidth="2"
      />
      <ellipse
        cx={x + (fuel ? 19.5 : 15)}
        cy="15"
        rx={fuel ? 18 : 13}
        ry="6"
        fill="#d5dab6"
        stroke="#98ac8b"
        strokeWidth="1.4"
      />
      {fuel ? (
        <>
          {[31, 55].map((y) => (
            <path key={y} d={`M${x + 2} ${y}h35`} stroke="#d5d8b4" strokeWidth="4" />
          ))}
          <path
            d={`M${x + 19} 71v8h${east ? -15 : 24}V43`}
            stroke="#869984"
            strokeWidth="5"
            fill="none"
          />
          <rect
            x={east ? 64 : 5}
            y="32"
            width="23"
            height="44"
            rx="10"
            fill="#8db3a5"
            stroke="#6c9685"
            strokeWidth="2"
          />
          <path d={`M${east ? 67 : 8} 44h17m-17 17h17`} stroke="#c8d7b3" strokeWidth="3" />
          {rear ? (
            <rect x={x + 9} y="38" width="20" height="9" rx="2" fill="#d4d1ae" />
          ) : (
            <>
              <circle cx={x + 19} cy="43" r="7" fill="#f5e3b5" stroke="#84937a" strokeWidth="2" />
              <path d={`M${x + 19} 43l3-3`} stroke="#b5875d" strokeWidth="2" />
            </>
          )}
        </>
      ) : (
        <>
          <rect
            x={rear ? 56 : east ? 50 : 14}
            y={side ? 26 : 16}
            width="27"
            height="48"
            rx="12"
            fill="#a6c39e"
            stroke="#7c9780"
            strokeWidth="2"
          />
          <path d={`M${x + 3} 46h24m-24 8h24`} stroke="#95ad87" strokeWidth="3" />
          {!rear && (
            <path
              d={`M${x + 9} 34q-5-7 0-7t2 8 7-3`}
              fill="none"
              stroke="#ce927e"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          )}
          <path d="M9 74h78" stroke="#849b7e" strokeWidth="9" strokeLinecap="round" />
          <path d="M12 74h72" stroke="#c2cbab" strokeWidth="3" />
          {[20, 38, 56, 74].map((cx) => (
            <circle key={cx} cx={cx} cy="74" r="2" fill="#809575" />
          ))}
        </>
      )}
      <path d={`M${x + 7} 70v11m20-11v11`} stroke="#83947d" strokeWidth="4" />
    </g>
  )
}
function StallView({ f, rear, east }: View) {
  const art = destinationArtwork(f.to ?? '')
  const color =
    art === 'fuel-stall'
      ? '#c5aa7d'
      : art === 'aquascape-stall'
        ? '#83b9b0'
        : art === 'newsstand'
          ? '#9caf98'
          : '#9db786'
  return (
    <g>
      <Plinth />
      <path d="M10 19v63m76-63v63" stroke="#aa9069" strokeWidth="4" />
      <path d="M-3 13 10-4h76l13 17Z" fill={color} stroke="#8b9d81" strokeWidth="1.5" />
      {[0, 16, 32, 48, 64, 80].map((x, i) => (
        <path key={x} d={`M${x} 13h16v13q-8 7-16 0Z`} fill={i % 2 ? cream : color} />
      ))}
      <rect
        x="8"
        y="32"
        width="80"
        height="29"
        rx="3"
        fill={rear ? '#cbb18b' : '#dce2bf'}
        stroke="#b5a17b"
        strokeWidth="1.5"
      />
      {rear ? (
        <path d="M15 36h65M15 47h65M15 57h65" stroke="#b49a76" strokeWidth="2" />
      ) : (
        <>
          <rect
            x={east ? 10 : 53}
            y="34"
            width="30"
            height="23"
            rx="3"
            fill={art === 'aquascape-stall' ? '#90bfb0' : '#ede3bc'}
          />
          {art === 'fuel-stall' ? (
            <path d={`M${east ? 24 : 68} 37q-10 12 0 14 10-2 0-14Z`} fill="#bd956a" />
          ) : art === 'bait-stall' ? (
            <path
              d={`M${east ? 21 : 64} 42q-5-8 1-7t1 9 8-2`}
              stroke="#cc9481"
              strokeWidth="3"
              fill="none"
            />
          ) : art === 'aquascape-stall' ? (
            <path d={`M${east ? 17 : 60} 46q10-9 18 0-8 9-18 0l-4-4v8Z`} fill="#f0d39a" />
          ) : (
            <path
              d={`M${east ? 14 : 57} 40h21m-21 6h17m-17 6h21`}
              stroke="#93a485"
              strokeWidth="2"
            />
          )}
        </>
      )}
      <rect
        x="0"
        y="63"
        width="96"
        height="21"
        rx="4"
        fill={wood}
        stroke="#a28a64"
        strokeWidth="1.5"
      />
      <path d="M5 70h86m-86 7h86" stroke="#dbc196" strokeWidth="2" />
    </g>
  )
}
function TreeView({ f, side, east }: View) {
  const pine = f.kind === 'pine'
  return (
    <g>
      <Ground />
      <path d="M42 30h12v60H42Z" fill="#a88b64" />
      <path d={`M48 58l${east ? 20 : -20}-21`} stroke="#a88b64" strokeWidth="5" />
      {pine ? (
        <>
          <path d="M1 66 48-66 95 66Z" fill="#5e8972" />
          <path d="M10 35 48-83 86 35Z" fill="#7ba380" />
          <path d="M21 2 48-96 75 2Z" fill={side ? '#91b58c' : '#89a983'} />
          <path d={`M48-74 ${east ? 72 : 24} 20`} stroke="#adc69a" strokeWidth="3" opacity=".55" />
        </>
      ) : (
        <>
          <circle cx="47" cy="10" r="41" fill="#759a6b" />
          <circle cx={east ? 33 : 61} cy="-9" r="32" fill="#94b67d" />
          <circle cx={east ? 61 : 33} cy="-24" r="25" fill="#acc58d" />
          {f.to === '/square/begging' && (
            <>
              <path
                d="M23 7h18v13H23m15 11h20v13H38m22-43h17v12H60"
                fill="#f4e4bd"
                stroke="#c4ac81"
                strokeWidth="1.2"
              />
              <path
                d="m24 8 8 7 8-7m-1 24 9 7 9-7"
                stroke="#c9a184"
                strokeWidth="1.5"
                fill="none"
              />
            </>
          )}
        </>
      )}
    </g>
  )
}
function BoardView({ f, rear, side, east }: View) {
  const art = destinationArtwork(f.to ?? '')
  const x = side ? 22 : 4,
    w = side ? 52 : 88
  return (
    <g>
      <Ground />
      <path d={`M${x + 8} 12v77m${w - 16}-77v77`} stroke="#aa916c" strokeWidth="5" />
      <rect
        x={x}
        y="-53"
        width={w}
        height="103"
        rx="4"
        fill={rear ? '#b9a17c' : f.color}
        stroke="#99865f"
        strokeWidth="2"
      />
      {rear ? (
        <>
          <path
            d={`M${x + 5} -46v88m${w / 2 - 5}-88v88m${w / 2 - 5}-88v88`}
            stroke="#dcc79c"
            strokeWidth="2"
          />
          <path
            d={`M${x + 4} -40 ${x + w - 4} 37M${x + w - 4} -40 ${x + 4} 37`}
            stroke="#9d8968"
            strokeWidth="4"
          />
        </>
      ) : (
        <>
          <rect x={east ? x + 5 : x + 19} y="-42" width={w - 24} height="50" rx="2" fill={cream} />
          {art === 'repair-bench' ? (
            <path d={`M${x + 15}-30l16 25m-7-27-12 20`} stroke="#9d9074" strokeWidth="4" />
          ) : (
            <path
              d={`M${x + 14}-28h${w - 30}m-${w - 30} 12h${w - 36}m-${w - 36} 12h${w - 30}`}
              stroke="#a0ad90"
              strokeWidth="2"
            />
          )}
          <path d={`M${x + 8} 28h${w - 16}`} stroke="#dbc99d" strokeWidth="2" />
        </>
      )}
      {art === 'repair-bench' && <rect x="-1" y="55" width="98" height="11" rx="3" fill={wood} />}
    </g>
  )
}
function TableView({ f, rear, side, east }: View) {
  const art = destinationArtwork(f.to ?? '')
  return (
    <g>
      <Plinth />
      <path d="M11 45v40m74-40v40" stroke="#a38b65" strokeWidth="5" />
      <path
        d={side ? 'M12 43 35 30h48l11 15v14H12Z' : 'M0 45 13 33h70l13 12v13H0Z'}
        fill="#c9aa7d"
        stroke="#a08b65"
        strokeWidth="1.5"
      />
      <path d="M5 49h85" stroke="#e5d0a3" strokeWidth="2" />
      {art === 'gift-table' ? (
        <>
          <rect x={east ? 47 : 18} y="-1" width="34" height="36" rx="3" fill="#9bb9a6" />
          <path d={`M${east ? 64 : 35} -1v36m-17-25h34`} stroke="#f2dfb5" strokeWidth="4" />
          <rect x={east ? 15 : 58} y="12" width="22" height="23" rx="2" fill="#d2a18b" />
        </>
      ) : art === 'fund' ? (
        <>
          <rect
            x={east ? 44 : 22}
            y="0"
            width="37"
            height="36"
            rx="4"
            fill="#a2b393"
            stroke="#809879"
            strokeWidth="1.5"
          />
          <path d={`M${east ? 51 : 29} 5h23`} stroke="#6f866b" strokeWidth="3" />
          {rear && <rect x={east ? 53 : 31} y="16" width="17" height="14" rx="2" fill="#8d9f7e" />}
        </>
      ) : art === 'market' ? (
        <>
          <path
            d="M48-19v50M17-6h62M23-6 10 15h27Zm50 0L60 15h27Z"
            stroke="#b39763"
            fill="#c5cbaa"
            strokeWidth="2"
          />
          <path d="M34 33h28" stroke="#a98e63" strokeWidth="4" />
        </>
      ) : f.kind === 'map-table' ? (
        <>
          <path
            d="M10 4 33-3 58 5 83-3v37l-25 7-25-8-23 8Z"
            fill={rear ? '#c8b28a' : '#e9d9a8'}
            stroke="#b1986b"
            strokeWidth="2"
          />
          <path d="M33-3v36M58 5v36" stroke="#c4aa7b" strokeWidth="2" />
        </>
      ) : (
        <>
          <path
            d={`M${east ? 53 : 14} -9h25v41h-25Z`}
            fill={cream}
            stroke="#b3a17b"
            strokeWidth="1.5"
          />
          <path d={`M${east ? 57 : 18} 1h17m-17 8h17m-17 8h13`} stroke="#9dad90" strokeWidth="2" />
          <Crate x={east ? 14 : 63} y={16} />
        </>
      )}
      <path
        d="M12 62h72v19H12Z"
        fill={rear ? '#c2a579' : '#d0b48a'}
        stroke="#ad936c"
        strokeWidth="1.5"
      />
      {rear && <path d="M16 64 79 79m0-15L16 79" stroke="#dcc59a" strokeWidth="2" />}
    </g>
  )
}
function SmallObjectView({ f, rear, side, east }: View) {
  const kind = f.kind,
    art = destinationArtwork(f.to ?? '')
  if (kind === 'tree' || kind === 'pine' || art === 'letter-tree')
    return <TreeView f={f} rear={rear} side={side} east={east} />
  if (kind === 'bench')
    return (
      <g>
        <Ground />
        {rear ? (
          <>
            <path d="M9 36v56m78-56v56" stroke="#6f816d" strokeWidth="6" />
            <rect
              x="1"
              y="5"
              width="94"
              height="48"
              rx="4"
              fill={wood}
              stroke="#9b7e57"
              strokeWidth="2"
            />
            <path d="M5 21h86M5 38h86M15 9v39m66-39v39" stroke="#dac297" strokeWidth="3" />
            <path d="M7 72h82" stroke="#a88a60" strokeWidth="10" />
          </>
        ) : (
          <>
            <path
              d={`M${east ? 20 : 54} 9v76h24V56h-24`}
              fill="none"
              stroke="#71816f"
              strokeWidth="6"
            />
            <path
              d={`M${east ? 16 : 50} 5h16v52h-16Z`}
              fill={wood}
              stroke="#9c7f57"
              strokeWidth="2"
            />
            <path
              d={`M${east ? 22 : 32} 59h44v13h-44Z`}
              fill="#d3b080"
              stroke="#a38a62"
              strokeWidth="2"
            />
          </>
        )}
      </g>
    )
  if (kind === 'mail' || art === 'idea-box')
    return (
      <g>
        <Ground />
        <path d="M43 36h12v56H43Z" fill="#a28a65" />
        <path
          d={side ? 'M23-2q0-27 26-27t26 27v49H23Z' : 'M5-4q0-23 26-23h34q26 0 26 23v51H5Z'}
          fill={art === 'idea-box' ? '#aeb99d' : f.color}
          stroke="#9c8065"
          strokeWidth="2"
        />
        {rear ? (
          <>
            <rect
              x="25"
              y="2"
              width="47"
              height="33"
              rx="4"
              fill={art === 'idea-box' ? '#9da98e' : '#ba7b68'}
            />
            <path d="M31 10h35m-35 14h35" stroke="#ddcaa3" strokeWidth="2" />
          </>
        ) : (
          <>
            <path
              d={`M${east ? 26 : 61} -20v-21h14v12h-14`}
              fill="none"
              stroke="#e9d5a9"
              strokeWidth="3"
            />
            <path d={`M${east ? 29 : 42} 18h25`} stroke="#8e7e61" strokeWidth="4" />
          </>
        )}
      </g>
    )
  if (
    kind === 'notice-board' ||
    kind === 'community-board' ||
    art === 'gallery' ||
    art === 'repair-bench'
  )
    return <BoardView f={f} rear={rear} side={side} east={east} />
  if (kind === 'stash' || kind === 'shell-safe')
    return (
      <g>
        <Ground />
        <path
          d="M5 21q0-47 43-47t43 47v63H5Z"
          fill={kind === 'shell-safe' ? '#a6b7a6' : wood}
          stroke="#967e58"
          strokeWidth="3"
        />
        <path d="M9 29h78M23-14v94M73-14v94" stroke="#d7c196" strokeWidth="4" />
        {rear ? (
          <>
            <path d="M18 38h24v9H18m37-9h24v9H55" stroke="#7d917c" strokeWidth="3" />
            <path d="M12 65h72" stroke="#a38d67" strokeWidth="3" />
          </>
        ) : (
          <>
            <path d={`M${east ? 20 : 64} 43h12v13h-12Z`} fill="#8d9b7c" />
            <path d="M16 63h64" stroke="#dcca9f" strokeWidth="2" />
          </>
        )}
      </g>
    )
  if (kind === 'books')
    return (
      <g>
        <Ground />
        {[
          { x: 4, y: 67, c: '#bc9982' },
          { x: 11, y: 44, c: '#a8b99e' },
          { x: side ? 20 : 3, y: 19, c: '#c7b58d' },
        ].map((p, i) => (
          <g key={i}>
            <rect
              x={p.x}
              y={p.y}
              width={side ? 65 : 83}
              height="20"
              rx="3"
              fill={p.c}
              stroke="#a58e6c"
              strokeWidth="2"
            />
            <path
              d={`M${p.x + 5} ${p.y + 6}h${side ? 52 : 70}m-${side ? 52 : 70} 5h${side ? 52 : 70}`}
              stroke={rear ? '#dfcdab' : '#f4e3bc'}
              strokeWidth="2"
            />
            {!rear && (
              <path
                d={`M${east ? p.x + 8 : p.x + 55} ${p.y + 1}v17`}
                stroke="#b38572"
                strokeWidth="4"
              />
            )}
          </g>
        ))}
      </g>
    )
  if (kind === 'lamp' || kind === 'lighthouse') {
    const lighthouse = kind === 'lighthouse'
    return (
      <g>
        <Ground />
        {lighthouse ? (
          <>
            <path d="M18 85 31-66h34L80 85Z" fill="#f0ddb4" stroke="#b79e77" strokeWidth="2" />
            <path d="M25 32h49l-3-22H28ZM30-16h37l-2-22H31Z" fill="#d6a088" />
            {rear ? (
              <path d="M41 44h15v19H41Z" fill="#d6c29a" />
            ) : (
              <Window x={east ? 34 : 49} y={42} w={12} />
            )}
          </>
        ) : (
          <path d="M48-64V86m-15 2h30" stroke="#738575" strokeWidth="7" />
        )}
        <rect
          x={lighthouse ? 20 : 27}
          y="-115"
          width={lighthouse ? 57 : 43}
          height="45"
          rx="5"
          fill="#f8e7aa"
          stroke="#78968c"
          strokeWidth="3"
        />
        <path d="M15-116 48-143 81-116Z" fill="#83acaa" stroke="#688e88" strokeWidth="2" />
        <path d={`M${east ? 35 : 58}-112v39`} stroke="#bac7a8" strokeWidth="3" />
        {rear ? (
          <path d="M22-74h51" stroke="#6f8c7e" strokeWidth="5" />
        ) : (
          <ellipse cx={east ? 38 : 58} cy="-93" rx="8" ry="15" fill="#fff7c8" />
        )}
      </g>
    )
  }
  if (kind === 'relic-case')
    return (
      <g>
        <Plinth />
        <path
          d="M9 80V-9q39-50 78 0v89Z"
          fill="#c7deca"
          fillOpacity=".8"
          stroke="#89aea0"
          strokeWidth="3"
        />
        <path d={`M${east ? 24 : 66}-10v82`} stroke="#eaf0ce" strokeWidth="3" />
        {rear ? (
          <path d="M26 74V8h44v66" fill="#bbccb6" stroke="#9aaf97" strokeWidth="2" />
        ) : (
          <path d="m48-4 22 31-22 24-22-24Z" fill="#b5a5c2" stroke="#978bab" strokeWidth="2" />
        )}
        <path d="M12 79h72" stroke={wood} strokeWidth="9" />
      </g>
    )
  if (kind === 'title-flag' || art === 'podium')
    return (
      <g>
        <Ground />
        {art === 'podium' ? (
          <>
            <path d="M0 65h32V44h32v21h32v26H0Z" fill="#b5bea5" stroke="#95a18a" strokeWidth="2" />
            <path
              d="M33-19h30l-4 28q-12 16-23 0Z"
              fill="#dabc7f"
              stroke="#b19766"
              strokeWidth="2"
            />
            <path d="M48 22v20m-14 0h28" stroke="#b19766" strokeWidth="4" />
            {rear && <path d="M38 65h20v16H38Z" fill="#9eac95" />}
          </>
        ) : (
          <>
            <path d="M19-88V85m-14 0h29" stroke="#a18b64" strokeWidth="5" />
            <path
              d={
                east
                  ? 'M22-79h52v63L47-29 22-16Z'
                  : rear
                    ? 'M23-79h63v63L54-29 23-16Z'
                    : 'M22-79h28v63l-14-9-14 9Z'
              }
              fill={rear ? '#ab9b76' : '#9eb39a'}
              stroke="#9c8966"
              strokeWidth="2"
            />
            {rear && <path d="M29-70h48m-48 15h48" stroke="#cabb91" strokeWidth="2" />}
            <circle
              cx={east ? 67 : 52}
              cy="67"
              r="16"
              fill="#e6c788"
              stroke="#b19a68"
              strokeWidth="2"
            />
          </>
        )}
      </g>
    )
  if (kind === 'arcade-cabinet')
    return (
      <g>
        <Ground />
        <path
          d={side ? 'M22-25h44l13 16v88H22Z' : 'M9-25h78v104H9Z'}
          fill="#8faca3"
          stroke="#6f9187"
          strokeWidth="2"
        />
        {rear ? (
          <>
            <rect
              x="19"
              y="-10"
              width="58"
              height="72"
              rx="3"
              fill="#a4b9a8"
              stroke="#7f9d8b"
              strokeWidth="2"
            />
            <path d="M27 29h42m-42 7h42m-42 7h42m-42 7h42" stroke="#799889" strokeWidth="3" />
            <path d="M49 62v17" stroke="#8a9277" strokeWidth="3" />
          </>
        ) : (
          <>
            <path d={`M${east ? 27 : 57}-11h13v35h-13Z`} fill="#d1c18d" />
            <path d={`M${east ? 33 : 51} 35h20v12h-20Z`} fill="#b4c39c" />
          </>
        )}
      </g>
    )
  if (kind === 'gramophone')
    return (
      <g>
        <Plinth />
        <rect
          x="9"
          y="51"
          width="78"
          height="34"
          rx="5"
          fill={wood}
          stroke="#a48a64"
          strokeWidth="2"
        />
        <ellipse cx="43" cy="52" rx="23" ry="7" fill="#788e77" />
        <path
          d={`M57 52q${east ? 33 : -28}-25 0-48`}
          fill="none"
          stroke="#b49b64"
          strokeWidth="7"
        />
        <path
          d={
            rear
              ? 'M29-5q3-36 33-29l20 30-28 23Z'
              : east
                ? 'M31-10q-10-37 22-46l29 30-27 25Z'
                : 'M65-10q10-37-22-46L14-26l27 25Z'
          }
          fill="#d9bd7b"
          stroke="#b39a65"
          strokeWidth="2"
        />
        {rear && <ellipse cx="62" cy="-12" rx="13" ry="8" fill="#c3a86c" />}
      </g>
    )
  if (art === 'trap-rack')
    return (
      <g>
        <Ground />
        <path d="M7 89V-11h82V89" fill="none" stroke="#ab9168" strokeWidth="5" />
        {[20, 48, 76].map((x, i) => (
          <g key={x}>
            <path d={`M${x}-10v${side ? 20 + i * 5 : 25}`} stroke="#a78c62" strokeWidth="2" />
            <rect
              x={x - 11}
              y={side ? 10 + i * 5 : 15}
              width="22"
              height="55"
              rx="10"
              fill="#bdab7c"
              stroke="#967e56"
              strokeWidth="2"
            />
            <path
              d={`M${x - 8} 31h16m-16 12h16m-16 12h16M${x - 4} 19v48m8-48v48`}
              stroke="#e0ca96"
              strokeWidth="1.3"
            />
            {rear && <ellipse cx={x} cy="21" rx="7" ry="4" fill="#8d8d62" />}
          </g>
        ))}
      </g>
    )
  if (art === 'supply-cart')
    return (
      <g>
        <Ground />
        <path d="M8 42h80v35H8Z" fill={wood} stroke="#a58b64" strokeWidth="2" />
        <path d="M13 53h70m-70 12h70" stroke="#ddc298" strokeWidth="2" />
        <Crate x={east ? 15 : 57} y={13} />
        <rect x={east ? 60 : 14} y="20" width="15" height="23" rx="3" fill="#9eb7a2" />
        <path d={`M${east ? 85 : 9} 54l${east ? 15 : -15}-16`} stroke="#aa9068" strokeWidth="4" />
        {[23, 74].map((cx) => (
          <g key={cx}>
            <circle cx={cx} cy="82" r="11" fill="#a28c62" />
            <circle cx={cx} cy="82" r="5" fill="#d9c195" />
          </g>
        ))}
      </g>
    )
  // Low ground decorations are seen from above; change the visible edging and arrangement.
  if (kind === 'flowers' || kind === 'pond' || art === 'garden' || art === 'fishing-spot')
    return (
      <g>
        <Ground />
        {kind === 'pond' || art === 'fishing-spot' ? (
          <>
            <ellipse cx="48" cy="54" rx={side ? 32 : 46} ry="31" fill="#d5c9a3" />
            <ellipse cx="48" cy="51" rx={side ? 26 : 39} ry="24" fill="#90bfba" />
            <path
              d={`M${east ? 32 : 47} 41q10 4 20 0m-31 17q10 4 20 0`}
              stroke="#cce4d2"
              strokeWidth="2"
              fill="none"
            />
            <ellipse cx={east ? 36 : 65} cy="46" rx="9" ry="5" fill="#93b17e" />
            {art === 'fishing-spot' && (
              <path
                d={`M${east ? 20 : 77} 75V-15q8-11 15-1`}
                fill="none"
                stroke="#ad9467"
                strokeWidth="2"
              />
            )}
          </>
        ) : (
          <>
            <rect x="2" y="19" width="92" height="64" rx="8" fill="#b99d73" />
            <rect
              x="7"
              y="24"
              width="82"
              height="51"
              rx="5"
              fill={art === 'garden' ? '#a18e64' : '#8da574'}
            />
            {[18, 39, 60, 79].map((x, i) => (
              <g key={x} transform={`translate(${x} ${rear ? 46 : side ? 30 + i * 8 : 34})`}>
                <path
                  d="M0 19V0m0 7q-14-15-16-5 3 10 16 5m0 0q14-15 16-5-3 10-16 5"
                  stroke="#789569"
                  strokeWidth="2"
                  fill="#adc18b"
                />
                {kind === 'flowers' && <circle r="7" fill={i % 2 ? '#f3d691' : '#d8a18f'} />}
              </g>
            ))}
          </>
        )}
      </g>
    )
  return <TableView f={f} rear={rear} side={side} east={east} />
}
function HarborView({ rotation }: { rotation: number }) {
  const anchors: Record<number, [number, number]> = { 90: [73, 34], 180: [35, 72], 270: [5, 34] }
  const [x, y] = anchors[rotation]
  return (
    <g>
      <Ground />
      <g transform={`rotate(${rotation} 48 48)`}>
        <path
          d="M0 3h96v24H80v67H65V27H18v67H3V27H0Z"
          fill="#bd9a6c"
          stroke="#8f7451"
          strokeWidth="2"
        />
        {[9, 17, 24].map((y) => (
          <path key={y} d={`M4 ${y}h88`} stroke="#e1c598" strokeWidth="2" />
        ))}
        {[39, 52, 65, 78, 90].map((y) => (
          <path key={y} d={`M5 ${y}h11m51 0h11`} stroke="#e1c598" strokeWidth="2" />
        ))}
        <path
          d="M34 40q14-13 28 0v33L48 91 34 73Z"
          fill="#e7d6af"
          stroke="#a58b65"
          strokeWidth="2"
        />
        <rect x="39" y="44" width="18" height="27" rx="5" fill="#8bb7ad" />
        <path d="M41 77h14" stroke="#be8e6c" strokeWidth="3" />
      </g>
      <g transform={`translate(${x} ${y})`}>
        <rect width="21" height="24" rx="3" fill="#eedbb2" stroke="#ad9773" strokeWidth="1.5" />
        <path d="M-3 1 10-10 24 1Z" fill="#8bb4af" stroke="#6e9690" strokeWidth="1.5" />
        <rect x={rotation === 90 ? 3 : 12} y="7" width="6" height="12" rx="2" fill="#8eb9ae" />
      </g>
      <g
        transform={`translate(${rotation === 90 ? 80 : rotation === 270 ? 10 : 75} ${rotation === 180 ? 72 : 22})`}
      >
        <path d="M0 0 3-34h10l3 34Z" fill="#f3dfb1" stroke="#b89d70" strokeWidth="1.2" />
        <path d="M2-11h12l-1-7H3Z" fill="#d69e86" />
        <path d="M0-35 8-43 16-35Z" fill="#78a4a1" />
      </g>
    </g>
  )
}
export function RotatedFacilityArt({ f, rotation }: { f: Facility; rotation: number }) {
  const side = rotation === 90 || rotation === 270,
    rear = rotation === 180,
    east = rotation === 90
  const w = (side ? f.h : f.w) * 32,
    h = (side ? f.w : f.h) * 32
  const view = { f, side, rear, east },
    art = destinationArtwork(f.to ?? '')
  let image
  if (f.kind === 'dock') image = <HarborView rotation={rotation} />
  else if (['aquarium', 'shop', 'shipyard', 'warehouse'].includes(f.kind) || art === 'home')
    image = <BuildingView {...view} />
  else if (['fuel', 'bait', 'workshop'].includes(f.kind)) image = <EquipmentView {...view} />
  else if (['fuel-stall', 'bait-stall', 'aquascape-stall', 'newsstand'].includes(art ?? ''))
    image = <StallView {...view} />
  else image = <SmallObjectView {...view} />
  return (
    <g data-art-direction={rotation} transform={`scale(${w / 96} ${h / 96})`}>
      <g
        transform={
          f.kind === 'dock' || !side
            ? undefined
            : east
              ? 'translate(6 0) skewY(-3) scale(.9 1)'
              : 'translate(4 0) skewY(3) scale(.9 1)'
        }
      >
        {image}
      </g>
    </g>
  )
}
