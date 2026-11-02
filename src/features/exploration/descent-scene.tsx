import descentSprite from './assets/pharaoh-descent-8f.png'

export function StairwayIllustration(){
 return <div className="exploration-stairway" aria-hidden="true"><div className="exploration-descent-sprite" style={{backgroundImage:`url(${descentSprite})`}}/></div>
}
export function DescentScene({floor}:{floor:number}){
 return <div className="exploration-descent-scene" role="status" aria-label={`지하 ${floor}층으로 내려가는 중`}><StairwayIllustration/><section className="exploration-warning" aria-label="층 이동 안내"><p>지하 <strong>{floor}</strong>층으로 내려가는 중...</p></section></div>
}
