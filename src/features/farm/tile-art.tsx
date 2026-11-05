import {farmTiles,type FarmTile} from './tile-catalog'

export function TileTexture({tile}:{tile:Exclude<FarmTile,'dirt'>}){
 if(tile==='brick')return <>
  <rect width="40" height="40" fill="#c4b59a"/>
  {[0,10,20,30].map((y,row)=><g key={y}>{[-1,0,1,2].map(column=>{const x=column*20+(row%2?10:0);return <g key={column}><rect x={x+1} y={y+1} width="18" height="8" rx="1" fill={(row+column)%2?'#b57860':'#c38b70'}/><path d={`M${x+3} ${y+2}h13`} stroke="#dcaa8b" strokeWidth=".7"/><path d={`M${x+4} ${y+7}h11`} stroke="#9d6855" strokeWidth=".5" opacity=".55"/></g>})}</g>)}
 </>
 if(tile==='sand')return <>
  <rect width="40" height="40" fill="#e3cf9c"/>
  <path d="M-4 9q8-4 16 0t20 0 16 0M-5 30q9-4 20 0t29 0" fill="none" stroke="#eeddb5" strokeWidth="1.2"/>
  <path d="m5 16 1 .4m13-12 1 .3m10 14 1-.4m-17 15 1 .3m20 3 1-.2" stroke="#baa579" strokeWidth=".8" strokeLinecap="round"/>
  <path d="M26 27q-5-7-8-1l4 5Z" fill="#f5e8cb" stroke="#c4b18c" strokeWidth=".6"/>
  <path d="m22 30-2-5m2 5 1-5" stroke="#dbc8a6" strokeWidth=".5"/>
  <ellipse cx="8" cy="23" rx="1.6" ry="1" fill="#bdb49b"/><ellipse cx="33" cy="7" rx="1.2" ry=".8" fill="#d3bea0"/>
 </>
 if(tile==='flagstone')return <>
  <rect width="40" height="40" fill="#adab90"/>
  <path d="M1 1h22l-2 15-8 4L1 17Z" fill="#e0d6b9"/>
  <path d="M25 1h14v20l-15-4Z" fill="#d4cbb0"/>
  <path d="m1 20 11 2 3 17H1Z" fill="#cec7ac"/>
  <path d="m15 23 8-4 16 5v15H18Z" fill="#e7dcc0"/>
  <path d="M3 3h17M27 3h10M3 23l7 1m9 2 5-3 12 3" fill="none" stroke="#f6edd5" strokeWidth=".8"/>
  <path d="m4 15 6 1m17 18h9" stroke="#beb69c" strokeWidth=".6"/>
 </>
 return tile==='stone'?<>
  <path d="M5 6 15 3 21 8 19 17 8 19 3 14Z M27 6 36 9 37 20 29 23 23 17Z M11 25 22 22 28 28 25 36 12 38 6 33Z" fill="#66766b" opacity=".22" transform="translate(0 1.5)"/>
  <path d="M5 6 15 3 21 8 19 17 8 19 3 14Z" fill="#a9ada0" stroke="#858f83" strokeWidth=".8"/>
  <path d="M27 6 36 9 37 20 29 23 23 17Z" fill="#c2c1af" stroke="#939c8a" strokeWidth=".8"/>
  <path d="M11 25 22 22 28 28 25 36 12 38 6 33Z" fill="#b7b9a9" stroke="#8c9788" strokeWidth=".8"/>
  <path d="m7 8 7-2 4 3m10 0 6 2m-23 16 10-2" fill="none" stroke="#e1e0ce" strokeWidth="1" strokeLinecap="round"/>
 </>:<>
  <rect width="40" height="40" fill="#72533c"/>
  {[0,10,20,30].map((y,i)=><g key={y}><rect x=".5" y={y+.5} width="39" height="9" rx=".7" fill={i%2?'#b48b5e':'#c19a6a'}/><path d={`M2 ${y+1.5}H38M5 ${y+5}q8-2 15 0t13 0`} fill="none" stroke="#dfbc86" strokeWidth=".6"/><path d={`M4 ${y+8}H36`} stroke="#916c48" strokeWidth=".5"/><circle cx="2.7" cy={y+5} r=".65" fill="#725c43"/><circle cx="37.3" cy={y+5} r=".65" fill="#725c43"/></g>)}
 </>
}
export function FarmTilePatterns(){return <>{farmTiles.map(({id})=>id==='dirt'?null:<pattern key={id} id={`farm-path-${id}`} width="40" height="40" patternUnits="userSpaceOnUse"><TileTexture tile={id}/></pattern>)}</>}
