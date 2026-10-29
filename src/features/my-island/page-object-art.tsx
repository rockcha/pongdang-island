import type { ReactNode } from 'react'
import type { DestinationArt } from './destination-art'

const c = {
  ink: '#8e8063',
  cream: '#f7e7c2',
  wood: '#bc9769',
  lightWood: '#dfbd88',
  teal: '#8ab4aa',
  leaf: '#8da679',
  coral: '#d59a80',
  gold: '#e4c17f',
  paper: '#fff1ce',
}
function Ground() {
  return <ellipse cx="48" cy="90" rx="54" ry="10" fill="#456751" opacity=".15" />
}
function Platform() {
  return (
    <>
      <Ground />
      <rect x="-2" y="80" width="100" height="13" rx="5" fill="#c7b99a" />
      <path d="M4 86h88" stroke="#eee1bd" strokeWidth="2" />
    </>
  )
}
function Crate({ x, y, w = 22, h = 19 }: { x: number; y: number; w?: number; h?: number }) {
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx="2"
        fill={c.wood}
        stroke="#9c805a"
        strokeWidth="1.2"
      />
      <path
        d={`M${x + 2} ${y + 5}h${w - 4}m-${w - 4} 8h${w - 4}M${x + 3} ${y + 2}l${w - 6} ${h - 4}`}
        stroke={c.lightWood}
        strokeWidth="1.5"
        fill="none"
      />
    </g>
  )
}
function Fish({ x = 0, y = 0, color = c.gold }: { x?: number; y?: number; color?: string }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="M0 0q10-11 23 0Q10 12 0 0l-8-6V6Z" fill={color} stroke="#a79269" strokeWidth=".8" />
      <circle cx="18" cy="-1" r="1.3" fill="#68796b" />
    </g>
  )
}
function Letter({ x, y, rotate = 0 }: { x: number; y: number; rotate?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotate})`}>
      <rect width="21" height="15" rx="2" fill={c.paper} stroke="#c9b58e" strokeWidth="1" />
      <path d="M1 1l9 7 10-7" fill="none" stroke="#d5b98d" strokeWidth="1" />
      <circle cx="11" cy="8" r="2" fill={c.coral} />
    </g>
  )
}
function Sprout({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="M0 8V-4" stroke="#789464" strokeWidth="2" />
      <ellipse cx="-5" cy="0" rx="6" ry="3" transform="rotate(25 -5 0)" fill="#9ab679" />
      <ellipse cx="5" cy="-4" rx="6" ry="3" transform="rotate(-25 5 -4)" fill="#7fa16e" />
    </g>
  )
}
function Counter() {
  return (
    <>
      <rect
        x="0"
        y="59"
        width="96"
        height="27"
        rx="4"
        fill={c.wood}
        stroke="#9d825e"
        strokeWidth="1.5"
      />
      <path d="M5 64h86M8 82h80M24 66v15m47-15v15" stroke={c.lightWood} strokeWidth="1.7" />
    </>
  )
}
function Canopy({ color, children }: { color: string; children: ReactNode }) {
  return (
    <g>
      <Platform />
      <path d="M8 10v69m80-69v69" stroke="#aa8e67" strokeWidth="4" />
      <path d="M-5 6L15-10h66l20 16Z" fill={color} stroke={c.ink} strokeWidth="1.5" />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <path
          key={i}
          d={`M${-5 + i * 18} 6h18v13q-9 7-18 0Z`}
          fill={i % 2 ? c.cream : color}
          stroke="#b5ac8c"
          strokeWidth=".7"
        />
      ))}
      {children}
      <Counter />
    </g>
  )
}
function Bottle({ x, y, color = c.teal }: { x: number; y: number; color?: string }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="M5 0h8v6l4 4v17q-8 4-16 0V10l4-4Z" fill={color} stroke="#869b89" strokeWidth="1.1" />
      <rect x="4" y="-2" width="10" height="5" rx="1" fill="#b59a70" />
      <path d="M4 15h10" stroke="#eee5bd" strokeWidth="3" />
    </g>
  )
}

export function PageObjectArt({ art }: { art: DestinationArt | undefined }) {
  if(art==='voyage-prediction')return <g><Platform/><rect x="7" y="3" width="82" height="66" rx="5" fill={c.cream} stroke={c.ink} strokeWidth="3"/><path d="M18 53h60M38 45h29l-6 10H44Z" fill={c.teal} stroke={c.ink} strokeWidth="2"/><path d="M51 43V12l-21 27h21m4-25 18 25H55Z" fill={c.coral} stroke={c.ink} strokeWidth="2"/><circle cx="20" cy="18" r="7" fill={c.gold}/><path d="M23 70v13m50-13v13" stroke={c.wood} strokeWidth="8"/></g>
  if(art==='fishing-log')return <g><Platform/><path d="M14 69V12q18-7 34 2 18-9 35-2v57q-18-6-35 2-17-8-34-2Z" fill={c.paper} stroke={c.ink} strokeWidth="3"/><path d="M48 15v55M21 29h18m-18 10h18m-18 10h13" stroke={c.wood} strokeWidth="3"/><Fish x={57} y={34}/><path d="M72 53h-15" stroke={c.teal} strokeWidth="3"/></g>
  if (art === 'home')
    return (
      <g>
        <Platform />
        <rect
          x="7"
          y="13"
          width="82"
          height="68"
          rx="7"
          fill={c.cream}
          stroke="#b39c77"
          strokeWidth="1.6"
        />
        <path d="M-5 18L48-21 101 18v9H-5Z" fill="#be9b86" stroke="#957963" strokeWidth="1.7" />
        <path d="M5 16L48-13 91 16" stroke="#e7c6a4" strokeWidth="2.5" fill="none" />
        <path d="M36 83V53q12-14 24 0v30Z" fill="#8aa99a" stroke="#d4c29b" strokeWidth="2" />
        <circle cx="53" cy="66" r="2" fill={c.gold} />
        <rect x="14" y="37" width="15" height="21" rx="3" fill="#a2c5b4" />
        <rect x="68" y="37" width="15" height="21" rx="3" fill="#a2c5b4" />
        <path d="M21 38v19m-6-10h13m47-9v19m-6-10h13" stroke={c.paper} strokeWidth="1.6" />
        <path d="M25 15q-6-8 0-11 5-2 8 4 3-6 8-4 6 3 0 11l-8 8Z" fill="#edc1a2" />
        <rect x="61" y="-14" width="15" height="28" fill="#ad9b86" />
        <path d="M58-14h21v5H58" fill="#c9b49a" />
        <Sprout x={15} y={75} />
        <Sprout x={81} y={75} />
      </g>
    )
  if (art === 'newsstand')
    return (
      <Canopy color="#9aada0">
        <rect x="15" y="24" width="66" height="32" rx="3" fill="#809b88" />
        {[0, 1, 2].map((i) => (
          <g key={i} transform={`translate(${21 + i * 19} 28)`}>
            <rect width="15" height="23" rx="1" fill={c.paper} />
            <path d="M3 5h9M3 8h9M3 14h9M3 18h9" stroke="#b9ae8c" strokeWidth="1" />
            <rect x="3" y="10" width="9" height="3" fill="#a7bc9b" />
          </g>
        ))}
        <path
          d="M8 56q7-22 14 0m5 0q7-22 14 0m15 0q8-22 16 0"
          fill={c.paper}
          stroke="#c9b992"
          strokeWidth="1.1"
        />
        <path d="M12 53h5m14 0h5m25 0h6" stroke="#aba487" strokeWidth="1" />
      </Canopy>
    )
  if (art === 'fuel-stall')
    return (
      <Canopy color="#c3a078">
        <g transform="translate(16 28)">
          <rect width="22" height="30" rx="8" fill="#91a69b" stroke="#708b80" strokeWidth="1.3" />
          <path d="M1 8h20M1 23h20" stroke="#d0d6b7" strokeWidth="2" />
          <circle cx="11" cy="15" r="5" fill={c.paper} />
          <path d="M11 15l3-3" stroke="#ae8965" strokeWidth="1.2" />
        </g>
        <Bottle x={45} y={29} color="#be9b79" />
        <path d="M74 52v-19h9l5 5v14Z" fill="#9baf8e" stroke="#7f9478" strokeWidth="1.2" />
        <path d="M78 34v-6h7v6" stroke="#8d8d70" strokeWidth="2" fill="none" />
      </Canopy>
    )
  if (art === 'bait-stall')
    return (
      <Canopy color="#8faa7e">
        <Crate x={9} y={37} w={36} h={21} />
        <path
          d="M14 37q-6-10 1-13t3 8 8-5m6 10q-5-10 2-11"
          fill="none"
          stroke="#d79987"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path d="M55 33h30l-3 24H58Z" fill="#a1b8a2" stroke="#819c87" strokeWidth="1.2" />
        <ellipse cx="70" cy="33" rx="15" ry="5" fill="#d8ddba" />
        <Sprout x={70} y={30} />
      </Canopy>
    )
  if (art === 'aquascape-stall')
    return (
      <Canopy color="#8db5b0">
        <rect
          x="10"
          y="27"
          width="76"
          height="31"
          rx="4"
          fill="#aed7c9"
          fillOpacity=".65"
          stroke="#7ea99e"
          strokeWidth="1.5"
        />
        <path d="M12 36q17-4 34 0t38 0" stroke="#e2efcf" strokeWidth="2" fill="none" />
        <path d="M14 56h68" stroke="#d9c796" strokeWidth="5" />
        <path
          d="M26 54V38m0 9-7-6m7 2 7-8m-7 4-4-7"
          stroke="#dcaa92"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <ellipse cx="54" cy="52" rx="12" ry="7" fill="#9eae9a" />
        <Sprout x={72} y={47} />
        <Fish x={40} y={39} color="#ead29b" />
      </Canopy>
    )
  if (art === 'supply-cart')
    return (
      <g>
        <Ground />
        <circle cx="17" cy="83" r="11" fill="#a58b65" stroke="#806b50" strokeWidth="2" />
        <circle cx="77" cy="83" r="11" fill="#a58b65" stroke="#806b50" strokeWidth="2" />
        {[17, 77].map((x) => (
          <path
            key={x}
            d={`M${x - 7} 83h14m-7-7v14m-5-12 10 10m-10 0 10-10`}
            stroke="#e1c18b"
            strokeWidth="1.5"
          />
        ))}
        <rect
          x="2"
          y="42"
          width="91"
          height="37"
          rx="5"
          fill={c.wood}
          stroke="#9d825e"
          strokeWidth="1.7"
        />
        <path d="M6 51h82M6 66h82" stroke={c.lightWood} strokeWidth="2" />
        <path d="M90 46l13-14" stroke="#9d825e" strokeWidth="4" strokeLinecap="round" />
        <Crate x={10} y={20} w={33} h={23} />
        <Bottle x={48} y={13} />
        <Bottle x={70} y={20} color="#d3afa2" />
        <path d="M16 18q10-18 21 0" stroke="#c7ac7c" strokeWidth="3" fill="none" />
      </g>
    )
  if (art === 'fishing-spot')
    return (
      <g>
        <Ground />
        <ellipse cx="48" cy="67" rx="47" ry="24" fill="#d1c7a2" />
        <ellipse cx="48" cy="64" rx="40" ry="18" fill="#91bfba" />
        <path d="M20 65q9 4 18 0m16 8q9 4 18 0" stroke="#d1e7cc" strokeWidth="1.6" fill="none" />
        <path d="M2 38h43v13H2Zm5 13v15m32-15v15" fill="#c2a174" stroke="#9e855e" strokeWidth="2" />
        <path d="M23 38L65-21q14 2 18 11" fill="none" stroke="#a28e67" strokeWidth="2.4" />
        <path d="M83-10v62q-7 7-4 12" fill="none" stroke="#e6d9af" strokeWidth="1.1" />
        <circle cx="80" cy="53" r="3" fill="#d99c82" />
        <path d="M5 59h20l-3 26H8Z" fill="#a2b7a5" stroke="#819786" strokeWidth="1.4" />
        <path d="M7 59q8-14 16 0" stroke="#afba9f" strokeWidth="1.8" fill="none" />
        <Fish x={45} y={63} />
      </g>
    )
  if (art === 'trap-rack')
    return (
      <g>
        <Ground />
        <path
          d="M7 10v76m82-76v76M3 12h90"
          stroke="#ac8f67"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <path d="M14 14v14m30-14v12m29-12v14" stroke="#e6c993" strokeWidth="1.8" />
        {[
          { x: 5, y: 30, w: 28, h: 40 },
          { x: 38, y: 28, w: 25, h: 35 },
          { x: 65, y: 32, w: 27, h: 39 },
        ].map((p, i) => (
          <g key={i}>
            <path
              d={`M${p.x} ${p.y + 7}q${p.w / 2} -14 ${p.w} 0v${p.h - 7}q-${p.w / 2} 9-${p.w} 0Z`}
              fill="#b69c71"
              stroke="#927b56"
              strokeWidth="1.4"
            />
            {[12, 20, 28].map((n) => (
              <path
                key={n}
                d={`M${p.x + 2} ${p.y + n}h${p.w - 4}`}
                stroke="#dcc394"
                strokeWidth="1.4"
              />
            ))}
            <path
              d={`M${p.x + 8} ${p.y + 5}v${p.h - 5}m10-${p.h - 5}v${p.h - 5}`}
              stroke="#dcc394"
              strokeWidth="1"
            />
            <ellipse cx={p.x + p.w / 2} cy={p.y + 10} rx="6" ry="4" fill="#778a73" />
          </g>
        ))}
        <path d="M4 85h88" stroke="#d6bd8d" strokeWidth="6" strokeLinecap="round" />
      </g>
    )
  if (art === 'garden')
    return (
      <g>
        <Ground />
        <rect
          x="-1"
          y="8"
          width="97"
          height="79"
          rx="8"
          fill="#ad9168"
          stroke="#907a58"
          strokeWidth="1.4"
        />
        {[16, 39, 62].map((y) => (
          <g key={y}>
            <path d={`M5 ${y + 16}h70`} stroke="#d0b386" strokeWidth="2" />
            {[17, 40, 63].map((x, i) => (
              <g key={x}>
                <ellipse cx={x} cy={y + 11} rx="9" ry="4" fill="#937d59" />
                <Sprout x={x} y={y + 2} />
                <circle cx={x} cy={y + 8} r="4" fill={i % 2 ? '#d3a275' : '#a5b27d'} />
              </g>
            ))}
          </g>
        ))}
        <path d="M-3 1v88m100-88v88M-3 4H97M-3 86H97" stroke="#d8bd8b" strokeWidth="3" />
        <path d="M77 61h15v19H77Z" fill="#91aba1" stroke="#789589" strokeWidth="1.2" />
        <path
          d="M80 62q0-12 8-10m3 17 10-9m-1-2 4 5"
          stroke="#789589"
          strokeWidth="2.4"
          fill="none"
        />
      </g>
    )
  if (art === 'market')
    return (
      <g>
        <Platform />
        <Counter />
        <path d="M48 4v54M23 57h50" stroke="#9c8c66" strokeWidth="3" strokeLinecap="round" />
        <path d="M17 16h62" stroke="#c4a674" strokeWidth="3" />
        <circle cx="48" cy="15" r="4" fill={c.gold} />
        <path d="M21 17L9 40h24Zm54 0L63 40h24Z" fill="none" stroke="#a5936b" strokeWidth="1.3" />
        <path
          d="M7 40q13 17 28 0Zm54 0q13 17 28 0Z"
          fill="#c9ae7a"
          stroke="#a38e62"
          strokeWidth="1.4"
        />
        <Fish x={10} y={39} />
        <path d="M69 35l7-7 8 7-8 6Z" fill="#a5c4af" />
        <path d="M15 72h15m36 0h15" stroke={c.paper} strokeWidth="3" />
      </g>
    )
  if (art === 'merchant-desk')
    return (
      <g>
        <Platform />
        <path d="M11 49v35m73-35v35" stroke="#a28b66" strokeWidth="5" />
        <rect
          x="0"
          y="36"
          width="96"
          height="18"
          rx="4"
          fill="#c8a776"
          stroke="#a68b63"
          strokeWidth="1.5"
        />
        <path d="M22 4h43v35H22Z" fill={c.paper} stroke="#c4ae82" strokeWidth="1.4" />
        <path d="M19 5q2-8 7-4m34 0q7-3 8 4" stroke="#dec799" strokeWidth="5" fill="none" />
        {[13, 22, 31].map((y) => (
          <g key={y}>
            <path d={`M29 ${y}l2 2 4-5`} stroke="#8dab8f" strokeWidth="1.4" fill="none" />
            <path d={`M40 ${y}h17`} stroke="#b7aa84" strokeWidth="1.4" />
          </g>
        ))}
        <Crate x={3} y={61} w={29} h={24} />
        <Crate x={65} y={61} w={29} h={24} />
        <path d="M74 16q8-9 16 0l-2 18H75Z" fill="#ab9b74" stroke="#8b805e" strokeWidth="1.3" />
        <path d="M74 18h16" stroke="#e5c98b" strokeWidth="2" />
      </g>
    )
  if (art === 'podium')
    return (
      <g>
        <Ground />
        <path d="M0 63h31V45h34v18h31v29H0Z" fill="#b6c0aa" stroke="#93a28c" strokeWidth="1.5" />
        <path d="M4 68h23m8-18h26m8 18h23" stroke="#e5e4c6" strokeWidth="2" />
        <path d="M35-1h27l-3 25q-11 15-21 0Z" fill="#e5c17e" stroke="#b99a60" strokeWidth="1.5" />
        <path
          d="M35 3H24q-4 21 16 20m22-20h10q4 21-16 20"
          stroke="#d7b476"
          strokeWidth="4"
          fill="none"
        />
        <path d="M48 30v12m-12 1h24" stroke="#b99a60" strokeWidth="4" strokeLinecap="round" />
        <path d="M48 5l3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z" fill="#fff0bd" />
        <path d="M9 59V2m77 57V2" stroke="#a0916c" strokeWidth="2.5" />
        <path d="M10 4h18v23l-9-5-9 5Z" fill="#9eb3a0" />
        <path d="M85 4H67v23l9-5 9 5Z" fill="#d3a08b" />
        <path d="M47 66v13m-4-10 4-3" stroke="#f6e6b8" strokeWidth="2" />
      </g>
    )
  if (art === 'gallery')
    return (
      <g>
        <Platform />
        <path d="M12 42v43m72-43v43" stroke="#a58d67" strokeWidth="4" />
        <rect
          x="-1"
          y="2"
          width="98"
          height="62"
          rx="4"
          fill="#c5a272"
          stroke="#a4865f"
          strokeWidth="1.7"
        />
        <rect x="5" y="8" width="86" height="50" rx="2" fill="#f4e5bf" />
        <rect x="11" y="14" width="49" height="36" rx="3" fill="#9cc6ba" />
        <Fish x={25} y={32} color="#f0d294" />
        <path d="M15 44q15-5 41 0" stroke="#cce3c7" strokeWidth="2" fill="none" />
        <rect x="67" y="16" width="17" height="13" rx="2" fill="#d6bd8e" />
        <path d="M69 21h13m-13 4h10M67 37h17m-17 6h14" stroke="#b7a47e" strokeWidth="1.4" />
        <path d="M-3-4q50 14 102 0" stroke="#b9a57b" strokeWidth="1.5" fill="none" />
        {[8, 29, 50, 71].map((x, i) => (
          <path key={x} d={`M${x} -2h12l-6 10Z`} fill={i % 2 ? '#d8a28a' : '#abc1a0'} />
        ))}
      </g>
    )
  if (art === 'fund' || art === 'gift-table')
    return (
      <g>
        <Platform />
        <path d="M10 51v33m76-33v33" stroke="#a58d67" strokeWidth="4" />
        <rect
          x="1"
          y="47"
          width="94"
          height="14"
          rx="4"
          fill="#c6a271"
          stroke="#a58a61"
          strokeWidth="1.5"
        />
        {art === 'fund' ? (
          <>
            <rect
              x="23"
              y="2"
              width="51"
              height="43"
              rx="7"
              fill="#a6b99d"
              stroke="#849c81"
              strokeWidth="1.5"
            />
            <path d="M34 7h28" stroke="#69836c" strokeWidth="3" strokeLinecap="round" />
            <path d="M38 24q-7-10 1-13 6-2 10 5 4-7 10-5 8 3 1 13L49 35Z" fill="#ead2a3" />
            <circle cx="16" cy="40" r="7" fill="#e2be7b" stroke="#b99b63" strokeWidth="1.2" />
            <circle cx="82" cy="36" r="7" fill="#e2be7b" stroke="#b99b63" strokeWidth="1.2" />
            <path d="M16 36v8m66-12v8" stroke="#f5dfab" strokeWidth="1.5" />
          </>
        ) : (
          <>
            {[
              { x: 8, y: 16, w: 30, h: 30 },
              { x: 44, y: 4, w: 40, h: 42 },
            ].map((p, i) => (
              <g key={i}>
                <rect
                  x={p.x}
                  y={p.y}
                  width={p.w}
                  height={p.h}
                  rx="3"
                  fill={i ? c.teal : c.coral}
                  stroke="#a59372"
                  strokeWidth="1.2"
                />
                <path
                  d={`M${p.x + p.w / 2} ${p.y}v${p.h}M${p.x} ${p.y + 9}h${p.w}`}
                  stroke={c.paper}
                  strokeWidth="4"
                />
                <path
                  d={`M${p.x + p.w / 2} ${p.y}q-18-15-20-4 2 7 20 4 18-15 20-4-2 7-20 4`}
                  fill="none"
                  stroke="#e5ca95"
                  strokeWidth="2.5"
                />
              </g>
            ))}
          </>
        )}
        <Crate x={31} y={65} w={34} h={21} />
      </g>
    )
  if (art === 'letter-tree')
    return (
      <g>
        <Ground />
        <path d="M40 26h12v59H40Z" fill="#a68d66" />
        <path d="M46 53L20 27m26 15 27-23" stroke="#a68d66" strokeWidth="5" strokeLinecap="round" />
        <circle cx="30" cy="16" r="25" fill="#8eac7d" />
        <circle cx="65" cy="11" r="27" fill="#a2ba88" />
        <circle cx="48" cy="-4" r="23" fill="#b4c798" />
        <Letter x={12} y={18} rotate={-12} />
        <Letter x={55} y={10} rotate={9} />
        <Letter x={39} y={37} rotate={-5} />
        <path d="M28 80h38v11H28Z" fill="#c1a47a" stroke="#a18b66" strokeWidth="1.5" />
        <path d="M34 86h26" stroke="#ecd8ad" strokeWidth="2" />
      </g>
    )
  if (art === 'idea-box')
    return (
      <g>
        <Platform />
        <path d="M42 38h12v46H42Z" fill="#a28b64" />
        <rect
          x="12"
          y="-1"
          width="72"
          height="53"
          rx="8"
          fill="#b8b6a0"
          stroke="#8f9b83"
          strokeWidth="1.7"
        />
        <path d="M19 1q29-15 58 0v10H19Z" fill="#cdd0b3" />
        <path d="M27 18h42" stroke="#768b75" strokeWidth="4" strokeLinecap="round" />
        <Letter x={37} y={4} rotate={-8} />
        <path
          d="M39 33q-4-11 5-13 10-2 10 8 0 5-5 7v6h-7v-6Z"
          fill="#f1d997"
          stroke="#c1a870"
          strokeWidth="1.2"
        />
        <path d="M42 45h7m-4-19v10" stroke="#bc9e65" strokeWidth="1.4" />
        <path
          d="M31 28h-6m39 0h6M35 18l-4-4m28 4 4-4"
          stroke="#e2c381"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      </g>
    )
  if (art === 'repair-bench')
    return (
      <g>
        <Platform />
        <path d="M10 46v39m77-39v39" stroke="#a28b64" strokeWidth="5" />
        <rect
          x="1"
          y="-4"
          width="94"
          height="47"
          rx="4"
          fill="#adbaa3"
          stroke="#8a9a7e"
          strokeWidth="1.5"
        />
        {[10, 26, 42, 58, 74, 88].map((x) => (
          <path key={x} d={`M${x} 3v3m0 13v3m0 13v3`} stroke="#8b9e81" strokeWidth="1.5" />
        ))}
        <path
          d="M21 4l7 7-8 8-6-5 4-7m4 11 9 14"
          fill="none"
          stroke="#e9ddb6"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <path
          d="M46 6l10 11m-5-18L41 9m7 12-8 12"
          stroke="#9b8662"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <rect
          x="65"
          y="8"
          width="21"
          height="28"
          rx="2"
          fill={c.paper}
          stroke="#c0ae84"
          strokeWidth="1"
        />
        <ellipse cx="76" cy="23" rx="4" ry="6" fill="#8ba58d" />
        <path d="M69 19h3m-3 7h3m8-7h3m-3 7h3m-7-8v12" stroke="#8ba58d" strokeWidth="1.2" />
        <rect
          x="-3"
          y="41"
          width="102"
          height="13"
          rx="4"
          fill="#c7a472"
          stroke="#a58c63"
          strokeWidth="1.5"
        />
        <Crate x={26} y={63} w={45} h={22} />
        <path d="M34 67h28" stroke="#d9c18f" strokeWidth="2" />
      </g>
    )
  return (
    <g>
      <Platform />
      <path d="M47 7v76" stroke="#a38b65" strokeWidth="5" />
      <path d="M10 12h66l16 12-16 12H10Z" fill="#b4c0a2" stroke="#8f9e80" strokeWidth="1.5" />
      <path d="M20 24h45" stroke={c.paper} strokeWidth="3" />
    </g>
  )
}
