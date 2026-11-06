import './waterwheel-art.css'
export function WaterwheelArt({compact=false}:{compact?:boolean}){
 if(compact)return <svg viewBox="0 0 256 256" aria-hidden="true"><image href="/farm/art/waterwheel-v1/thumbnail.png" width="256" height="256"/></svg>
 return <svg viewBox="0 0 443.5 443.5" overflow="hidden" aria-hidden="true"><image className="farm-waterwheel-sprite" href="/farm/art/waterwheel-v1/sprites.png" width="1774" height="887"/></svg>
}
