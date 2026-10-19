export function BoatSprite({src,name,className='',animate=true}:{src:string;name:string;className?:string;animate?:boolean}){
 return <span role="img" aria-label={name} className={`port-boat-sprite block aspect-square ${className}`} data-animate={animate||undefined} style={{backgroundImage:`url("${src}")`}}/>
}
