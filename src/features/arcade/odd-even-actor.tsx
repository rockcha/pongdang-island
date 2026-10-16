export type OddEvenScene='mixing'|'asking'|'submitting'|'opening'|'result'
export function OddEvenActor({scene,pearls}:{scene:OddEvenScene;pearls:number|null}){
 return <div className="odd-even-actor-space" aria-hidden="true"><div className={`odd-even-actor odd-even-actor--${scene}`}>
  <div className="odd-even-sprite"/>
  {(scene==='opening'||scene==='result')&&pearls!==null&&<div className="odd-even-shell-pearls">{Array.from({length:pearls},(_,i)=><span key={i} className="odd-even-pearl" style={{animationDelay:`${360+i*22}ms`}}/>)}</div>}
 </div></div>
}
