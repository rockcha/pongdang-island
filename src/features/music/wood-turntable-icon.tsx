export function WoodTurntableIcon({playing}:{playing:boolean}){
 return <svg aria-hidden="true" data-playing={playing} className="wood-turntable size-7 shrink-0" viewBox="0 0 64 56" fill="none">
  <rect x="6" y="16" width="52" height="33" rx="10" fill="#BD864F" stroke="#805634" strokeWidth="2"/>
  <rect x="8" y="17" width="48" height="27" rx="8" fill="#E7BF86"/>
  <g className="turntable-record">
   <circle cx="25" cy="25" r="20" fill="#383131" stroke="#655047" strokeWidth="1.5"/>
   <circle cx="25" cy="25" r="15" stroke="#655959" strokeWidth="1.5"/>
   <path d="M12 17a15 15 0 0 1 8-6M30 39a15 15 0 0 0 8-6" stroke="#A69A90" strokeWidth="2" strokeLinecap="round"/>
   <circle cx="25" cy="25" r="8.5" fill="#F4AA72"/>
   <path d="M26 21v6m0-5 3 1" stroke="#855332" strokeWidth="1.5" strokeLinecap="round"/>
   <ellipse cx="24.5" cy="27.5" rx="2" ry="1.5" fill="#855332"/>
   <circle cx="25" cy="25" r="1" fill="#FFF5DD"/>
  </g>
  <circle cx="49" cy="14" r="3" fill="#84644B" stroke="#64432D"/>
  <g className="turntable-arm" strokeLinecap="round" strokeLinejoin="round">
   <path d="M49 14v14l-9 7" stroke="#70513B" strokeWidth="4"/>
   <path d="M49 14v14l-9 7" stroke="#FFF2D5" strokeWidth="2.5"/>
   <path d="m40 33-4 3 3 3 4-3" fill="#FFF5DD" stroke="#70513B" strokeWidth="1.5"/>
  </g>
  <circle cx="51" cy="40" r="3" fill={playing?'#73BE78':'#987451'} stroke="#70513B"/>
 </svg>
}
