function Foundation() {
  return (
    <>
      <ellipse cx="48" cy="92" rx="55" ry="10" fill="#456b5c" opacity=".16" />
      <path d="M-3 76 9 69h82l9 10v13H-3Z" fill="#c4bda2" stroke="#a59e82" strokeWidth="1.5" />
      <path d="M-2 81h101M7 87h83" stroke="#e7ddba" strokeWidth="2" />
      {[7, 82].map((x) => (
        <path key={x} d={`M${x} 80l-4 5m10-5-4 5`} stroke="#b79d70" strokeWidth="2" />
      ))}
    </>
  )
}
function Gauge({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle r="8" fill="#fff1cc" stroke="#677f73" strokeWidth="2" />
      <path d="M-5 0a5 5 0 0110 0" fill="none" stroke="#c5b98d" strokeWidth="1.2" />
      <path d="M0 0 3-3" stroke="#be815b" strokeWidth="1.8" strokeLinecap="round" />
      <circle r="1.4" fill="#81907a" />
    </g>
  )
}
function Valve({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`} stroke="#b87d5e" fill="none" strokeWidth="2">
      <circle r="5" />
      <path d="M-5 0h10M0-5V5" />
    </g>
  )
}
function Jar({ x, y, color = '#a6c3a0' }: { x: number; y: number; color?: string }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect width="12" height="17" rx="3" fill={color} stroke="#7f9b83" strokeWidth="1.2" />
      <rect x="-1" y="-2" width="14" height="5" rx="2" fill="#cfb58b" />
      <rect x="2" y="6" width="8" height="7" rx="1.5" fill="#f7e8be" />
      <path
        d="M4 11q-2-4 1-3t1 3 3-2"
        fill="none"
        stroke="#c18b79"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </g>
  )
}
export function FuelProductionFacility() {
  return (
    <g>
      <Foundation />
      {/* Raised pipework connects the refining tank to a separate cooling column. */}
      <path
        d="M44 19V-9h33v25"
        fill="none"
        stroke="#798e81"
        strokeWidth="8"
        strokeLinejoin="round"
      />
      <path
        d="M44 19V-9h33v25"
        fill="none"
        stroke="#c4cbb0"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path d="M14 62V9h9" fill="none" stroke="#b79670" strokeWidth="6" />
      <rect
        x="10"
        y="4"
        width="15"
        height="6"
        rx="2"
        fill="#d4bb93"
        stroke="#a88963"
        strokeWidth="1.2"
      />
      <path d="M28 61v17m28-17v17" stroke="#7a8877" strokeWidth="5" />
      <rect
        x="20"
        y="8"
        width="43"
        height="59"
        rx="19"
        fill="#b6bc9d"
        stroke="#778f7a"
        strokeWidth="2"
      />
      <ellipse cx="41.5" cy="13" rx="19" ry="7" fill="#d6d5b3" stroke="#93a18a" strokeWidth="1.5" />
      <path d="M24 28h35M24 54h35" stroke="#839b84" strokeWidth="5" />
      <path d="M24 26h35M24 52h35" stroke="#d6d7b4" strokeWidth="2" />
      <path d="M28 20v7m0 7v14" stroke="#e1dec0" strokeWidth="3" strokeLinecap="round" />
      <Gauge x={42} y={40} />
      <rect
        x="64"
        y="15"
        width="25"
        height="48"
        rx="11"
        fill="#8eb5aa"
        stroke="#688f82"
        strokeWidth="1.8"
      />
      <ellipse cx="76.5" cy="18" rx="11" ry="4" fill="#bcd3b9" />
      {[29, 41, 53].map((y) => (
        <path key={y} d={`M66 ${y}h21`} stroke="#ccdab9" strokeWidth="3" />
      ))}
      <path
        d="M42 66v8h30V61"
        fill="none"
        stroke="#778f7c"
        strokeWidth="7"
        strokeLinejoin="round"
      />
      <path
        d="M42 66v8h30V61"
        fill="none"
        stroke="#c8cfad"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <Valve x={59} y={74} />
      <rect
        x="4"
        y="47"
        width="16"
        height="28"
        rx="3"
        fill="#d0a17b"
        stroke="#a17d5d"
        strokeWidth="1.5"
      />
      <rect x="8" y="51" width="8" height="8" rx="2" fill="#f5dfaa" />
      <path d="M10 62h5m-5 4h5" stroke="#967d5c" strokeWidth="1.5" />
      <path d="M20 60h6" stroke="#8d9c82" strokeWidth="3" />
      <g transform="translate(77 67)">
        <rect width="18" height="20" rx="3" fill="#c88e67" stroke="#a37154" strokeWidth="1.5" />
        <path d="M4 0v-4h9v4" fill="none" stroke="#a37154" strokeWidth="2" />
        <path d="M9 5q-8 9 0 10 8-1 0-10Z" fill="#f6dfaa" />
      </g>
      <path
        d="M11-6q-5-5 0-10m6 6q5-5 0-10"
        stroke="#f8eed2"
        strokeWidth="3"
        strokeLinecap="round"
        opacity=".8"
        fill="none"
      />
    </g>
  )
}
export function BaitProductionFacility() {
  return (
    <g>
      <Foundation />
      {/* Open culture vats, aeration lines and a packing belt replace a house facade. */}
      <path
        d="M9 68V-4h62v13"
        fill="none"
        stroke="#a18c68"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <path d="M12-2h55" stroke="#d5be90" strokeWidth="2" />
      {[22, 49].map((x, i) => (
        <g key={x}>
          <path d={`M${x + 3} -3v16`} stroke="#8aa398" strokeWidth="3" />
          <rect
            x={x - 10}
            y="13"
            width="25"
            height="42"
            rx="10"
            fill="#b9d1b4"
            stroke="#739b84"
            strokeWidth="1.7"
          />
          <path d={`M${x - 8} 32q10-4 21 0v14q0 8-10 8t-11-8Z`} fill={i ? '#a3b682' : '#9bbda3'} />
          <ellipse
            cx={x + 2.5}
            cy="16"
            rx="11"
            ry="4"
            fill="#d9dfb9"
            stroke="#829f86"
            strokeWidth="1.2"
          />
          <path d={`M${x - 3} 21v8`} stroke="#edf0cd" strokeWidth="2" strokeLinecap="round" />
          <path
            d={`M${x - 3} 41q-5-7 0-7t2 8 7-3`}
            fill="none"
            stroke="#d28f7d"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <circle cx={x + 6} cy="25" r="2" fill="#eef0cc" />
          <circle cx={x + 8} cy="30" r="1.3" fill="#eef0cc" />
          <path d={`M${x - 5} 55v8m15-8v8`} stroke="#81997c" strokeWidth="3" />
        </g>
      ))}
      <rect
        x="70"
        y="19"
        width="23"
        height="20"
        rx="3"
        fill="#d8c59a"
        stroke="#aa9670"
        strokeWidth="1.5"
      />
      <path d="M72 39h19l-5 12h-9Z" fill="#9caf89" stroke="#7b9677" strokeWidth="1.5" />
      <path d="M81 51v10" stroke="#78927c" strokeWidth="4" />
      <path d="M75 28q-3-9 5-10 4 7-5 10m6 0q-1-9 7-8 1 7-7 8" fill="#8aaa78" />
      <rect
        x="10"
        y="65"
        width="87"
        height="16"
        rx="8"
        fill="#8b9b81"
        stroke="#718770"
        strokeWidth="1.5"
      />
      <rect x="14" y="69" width="79" height="8" rx="4" fill="#c3c9a7" />
      {[20, 34, 48, 62, 76, 88].map((x) => (
        <circle key={x} cx={x} cy="73" r="2.5" fill="#8d9c7e" />
      ))}
      <path d="M19 82v6m68-6v6" stroke="#829078" strokeWidth="4" />
      <Jar x={21} y={48} />
      <Jar x={41} y={48} color="#adc2a5" />
      <Jar x={73} y={48} color="#c5c99c" />
      <path d="M3 63v20h10" fill="none" stroke="#c2a37b" strokeWidth="3" />
    </g>
  )
}
export function PersonalBaitWorkshop() {
  return (
    <g>
      <Foundation />
      <path d="M7 63V-4h80v67" fill="none" stroke="#9b8e90" strokeWidth="4" />
      <path d="M10-2h74" stroke="#cec0b3" strokeWidth="2" />
      <rect
        x="9"
        y="5"
        width="76"
        height="31"
        rx="3"
        fill="#c4bec9"
        stroke="#9c92ab"
        strokeWidth="1.5"
      />
      {[20, 34, 48].map((x, i) => (
        <g key={x}>
          <path
            d={`M${x} 10v9q-5 8 1 9 6 0 5-5`}
            fill="none"
            stroke={i === 1 ? '#ca9c7c' : '#f0dfba'}
            strokeWidth="2"
            strokeLinecap="round"
          />
        </g>
      ))}
      <Jar x={66} y={15} color="#b4aac2" />
      <path d="M12 66v20m73-20v20" stroke="#a18b6c" strokeWidth="5" />
      <rect
        x="1"
        y="59"
        width="95"
        height="12"
        rx="3"
        fill="#c5a477"
        stroke="#a08863"
        strokeWidth="1.5"
      />
      <path d="M11 46h43l-5 12H16Z" fill="#b6bbc6" stroke="#9698aa" strokeWidth="1.5" />
      <ellipse cx="32" cy="46" rx="21" ry="5" fill="#e2d0a6" stroke="#b2a081" strokeWidth="1.3" />
      <path
        d="M25 45q-5-6 0-6t2 7 8-3"
        fill="none"
        stroke="#d49b87"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path d="M38 29 32 45" stroke="#a08b6c" strokeWidth="3" strokeLinecap="round" />
      <Jar x={62} y={41} color="#b7adc5" />
      <Jar x={79} y={41} />
      <rect
        x="25"
        y="75"
        width="42"
        height="11"
        rx="2"
        fill="#bea17b"
        stroke="#a28a65"
        strokeWidth="1.2"
      />
      <path d="M30 80h32" stroke="#e4cda1" strokeWidth="2" />
    </g>
  )
}
