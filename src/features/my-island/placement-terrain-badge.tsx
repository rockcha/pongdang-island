type Terrain='land'|'water'|'any'|'shore'
const labels:Record<Terrain,string>={land:'땅에 배치',water:'바다에 배치',any:'땅과 바다에 배치 가능',shore:'해안에 배치'}
export function PlacementTerrainBadge({terrain}:{terrain:Terrain}){
 return <span className="island-terrain-badge" role="img" aria-label={labels[terrain]} title={labels[terrain]}>
  <svg viewBox="0 0 36 28" aria-hidden="true">
   <rect x="2" y="6" width="32" height="20" rx="5" fill={terrain==='water'?'#78b9bf':'#c4a278'}/>
   <rect x="2" y="2" width="32" height="20" rx="5" fill={terrain==='water'?'#a7d9dd':'#e4c9a4'}/>
   {terrain==='land'&&<path d="M8 9h4m10 7h4m-6-9h3" stroke="#ba956d" strokeWidth="1.5" strokeLinecap="round"/>}
   {terrain==='water'&&<path d="M7 9q3 3 6 0m3 6q3 3 6 0m1-9q3 3 6 0" fill="none" stroke="#effafb" strokeWidth="1.5" strokeLinecap="round"/>}
   {(terrain==='any'||terrain==='shore')&&<><path d="M20 2h9q5 0 5 5v10q0 5-5 5H18q5-5 1-9t1-11Z" fill="#a7d9dd"/><path d="M24 8q2 2 5 0m-6 7q2 2 5 0" fill="none" stroke="#effafb" strokeWidth="1.5" strokeLinecap="round"/>{terrain==='any'&&<path d="m11 10-3 2 3 2m-3-2h7m-2 3 3 2-3 2m3-2H9" fill="none" stroke="#95663c" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>}</>}
  </svg>
 </span>
}
