export function FarmCountBadge({count,label,unit='개'}:{count:number;label:string;unit?:string}){
 return <b className="farm-count-badge" data-empty={count===0} aria-label={`${label} ${count}${unit}`}>{count.toLocaleString()}</b>
}
