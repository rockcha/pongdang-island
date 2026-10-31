import type {CSSProperties} from 'react'
import type {AilmentKind} from './ailments'
import {weaponVisuals,type WeaponVisual} from './weapon-visuals'
import './weapon-attack-effect.css'

function Strike({visual}:{visual:WeaponVisual}){
 const {motion,detail}=visual
 return <svg viewBox="0 0 180 180" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
  {motion==='slash'?<><path className="weapon-edge" d="M25 136Q38 49 153 31Q76 61 25 136Z" fill="currentColor" stroke="none"/><path d="M27 132Q69 52 150 33" stroke="var(--weapon-accent)" strokeWidth="1.5"/>{detail==='serrated'&&<path d="m42 111 3-20 10 2 1-19 13 3 6-19 14 4"/>}</>:
   motion==='thrust'?<>{(detail==='trident'?[-17,0,17]:[0]).map((offset,i)=><g key={i} transform={`translate(${offset} 0)`}><path d="M90 152V36" strokeWidth={i===1?5:3}/><path d="m90 19 8 32-8-7-8 7Z" fill="var(--weapon-accent)" stroke="none"/></g>)}<path d="M76 121V77m28 48V68" opacity=".4"/></>:
   motion==='cleave'?<><path className="weapon-edge" d="M40 24Q138 47 138 141L112 122Q115 67 40 24Z" fill="currentColor" stroke="none"/><path d="M43 27Q126 55 134 136" stroke="var(--weapon-accent)" strokeWidth="2"/><path d="m119 117 10 18-23 7" opacity=".7"/></>:
   motion==='smash'?<><path d="M90 18v90m-14-73 4 58m24-58-4 58" strokeWidth="5"/><path d="m70 111 20 12 20-12M51 127l24 5-12 16m66-21-24 5 12 16M90 141v20" stroke="var(--weapon-accent)"/><ellipse cx="90" cy="126" rx="40" ry="11" strokeWidth="2"/></>:
   motion==='hook'||motion==='scythe'?<><path className="weapon-edge" d="M32 135C-6 49 130 5 150 74C123 40 42 65 32 135Z" fill="currentColor" stroke="none"/><path d="M31 127C11 59 111 25 144 66" stroke="var(--weapon-accent)" strokeWidth="1.5"/>{detail==='serrated'&&<path d="m58 75 9 13 8-22 12 11 9-23"/>}{motion==='scythe'&&<path d="M43 140Q92 121 143 78" opacity=".6"/>}</>:
   motion==='fan'?<>{[-36,-18,0,18,36].map(angle=><path key={angle} d="M90 150Q67 78 90 27Q98 93 90 150Z" fill="currentColor" stroke="none" transform={`rotate(${angle} 90 150)`}/>)}<path d="M28 70Q90 10 152 70" stroke="var(--weapon-accent)" opacity=".6"/></>:
   motion==='twin'?<><path className="weapon-edge" d="M24 30Q104 46 149 149Q82 78 24 30Z" fill="currentColor" stroke="none"/><path className="weapon-edge" d="M155 30Q76 49 29 151Q99 81 155 30Z" fill="var(--weapon-accent)" opacity=".8" stroke="none"/></>:
   motion==='staff'?<><path d="M24 112Q90 14 154 72M25 108Q90 167 154 74" strokeWidth="8"/><path d="M29 112Q90 25 150 72M30 112Q90 157 150 75" stroke="var(--weapon-accent)" strokeWidth="1.5"/><circle cx="24" cy="112" r="6" fill="var(--weapon-accent)"/><circle cx="154" cy="73" r="6" fill="var(--weapon-accent)"/></>:
   motion==='flail'?<><path className="weapon-chain" d="M25 145Q135 139 122 48" strokeWidth="5" strokeDasharray="7 6"/>{detail==='dart'?<path d="m121 22 11 39-11-8-11 8Z" fill="var(--weapon-accent)"/>:<><path d="m121 28 18 12-4 26-24 4-10-22Z" fill="currentColor"/><path d="m108 45 25 13m-17-21 12 24" stroke="var(--weapon-accent)" strokeWidth="2"/></>}<path d="M24 135Q120 124 119 61" opacity=".4"/></>:
   motion==='ring'?<g className="weapon-rotating-disc"><circle cx="90" cy="90" r="38" strokeWidth={detail==='sun'?9:6}/><circle cx="90" cy="90" r="30" stroke="var(--weapon-accent)" strokeWidth="1"/>{detail==='sun'&&Array.from({length:6},(_,i)=><path key={i} d="m90 45 11-15-2 17" fill="currentColor" transform={`rotate(${i*60} 90 90)`}/>)}<path d="M54 87a37 37 0 0 1 34-34" stroke="var(--weapon-accent)"/></g>:
   <><path d="M90 153V31" strokeWidth={motion==='bolt'?5:3}/><path d="m90 20 9 25-9-4-9 4Z" fill="var(--weapon-accent)" stroke="none"/><path d="m90 129-10 14v15l10-11 10 11v-15Z" fill="currentColor" stroke="none"/>{motion==='arrow'&&<path d="M69 145q-20-54 5-98" opacity=".45"/>}</>}
 </svg>
}

function ProcMark({kind}:{kind:AilmentKind|'cleanse'}){
 return <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
  {kind==='bleed'?<><path d="m21 18 45 65M37 10l39 55M29 34l-8 20 14-9" strokeWidth="4"/><path d="M73 66c-14 17-11 26-2 26s12-9 2-26Z" fill="currentColor" stroke="none"/></>:
   kind==='freeze'?<>{[0,60,120].map(angle=><g key={angle} transform={`rotate(${angle} 50 50)`}><path d="M50 9v82M40 17l10 10 10-10M40 83l10-10 10 10"/></g>)}<circle cx="50" cy="50" r="29" opacity=".5"/></>:
   kind==='burn'?<><path d="M50 12c18 23-10 24 4 43 5-9 11-13 13-21 25 27 10 54-17 54-26 0-40-24-20-49-1 10 6 13 9 16-5-19 12-22 11-43Z" fill="currentColor" fillOpacity=".4"/><path d="M50 44c13 20-11 24 0 35"/></>:
   kind==='blind'?<><path d="M11 51Q50 17 89 51Q50 84 11 51Z"/><circle cx="50" cy="51" r="13"/><path d="m20 83 61-65" strokeWidth="5"/><path d="M12 38h21m35 29h21" opacity=".5"/></>:
   kind==='weaken'?<><path d="m50 9 32 12v28c0 23-32 41-32 41S18 72 18 49V21Z"/><path d="m47 22 9 19-13 14 13 21M31 50h-9m55 0h-9" strokeWidth="3"/></>:
   <><circle cx="50" cy="50" r="29"/><path d="m50 12 8 29 29 9-29 9-8 29-8-29-29-9 29-9Z" fill="currentColor" fillOpacity=".3"/><path d="m38 51 8 8 17-20" strokeWidth="4"/></>}
 </svg>
}

export function WeaponAttackEffect({weaponId,phase,critical=false,missed=false,proc,lifesteal=false,cleanse=false}:{weaponId:string;phase:'prepare'|'player';critical?:boolean;missed?:boolean;proc?:AilmentKind;lifesteal?:boolean;cleanse?:boolean}){
 const visual=weaponVisuals[weaponId]??weaponVisuals['dull-dagger'],ranged=['arrow','bolt','ring'].includes(visual.motion),hit=phase==='player'&&!missed
 const style={'--weapon-color':visual.color,'--weapon-accent':visual.accent,'--weapon-angle':`${visual.angle}deg`,'--weapon-reach':visual.reach,'--weapon-weight':visual.weight} as CSSProperties
 return <div className="weapon-attack-effect" data-weapon={weaponId} data-motion={visual.motion} data-tier={visual.tier} data-phase={phase} data-critical={critical||undefined} data-missed={missed||undefined} style={style} aria-hidden="true">
  <div className={ranged?'weapon-projectile':'weapon-swing'}><Strike visual={visual}/></div>
  {hit&&<div className="weapon-hit-burst"><span/>{Array.from({length:visual.tier==='ultimate'?16:critical?10:6},(_,i)=><i key={i} style={{'--spark-angle':`${i*(visual.tier==='ultimate'?22.5:critical?36:60)+visual.angle}deg`} as CSSProperties}/>)}</div>}
  {hit&&visual.tier==='ultimate'&&<div className="weapon-grand-seal"><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="40"/><path d="m50 5 39 67H11Zm0 90L11 28h78Z"/><circle cx="50" cy="50" r="25"/></svg></div>}
  {hit&&proc&&<div className="weapon-proc" data-proc={proc}><ProcMark kind={proc}/></div>}
  {hit&&lifesteal&&<div className="weapon-life-return">{Array.from({length:3},(_,i)=><i key={i} style={{'--orb-lane':`${(i-1)*25}px`,'--orb-delay':`${i*.08}s`} as CSSProperties}/>)}</div>}
  {hit&&cleanse&&<div className="weapon-self-cleanse"><ProcMark kind="cleanse"/></div>}
 </div>
}
