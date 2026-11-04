import {farmTerrainArt} from './terrain-art'

// Mirror both axes so adjacent repeats share identical edge pixels.
// The same material is used by the map, tile picker, and shop preview.
export function FarmDirtTexture(){
 const tile=<image href={farmTerrainArt.dirt.path} width="60" height="60"/>
 return <>
  {tile}
  <g transform="translate(120 0) scale(-1 1)">{tile}</g>
  <g transform="translate(0 120) scale(1 -1)">{tile}</g>
  <g transform="translate(120 120) scale(-1 -1)">{tile}</g>
 </>
}
export function FarmDirtPattern(){
 return <pattern id="farm-path" width="120" height="120" patternUnits="userSpaceOnUse"><FarmDirtTexture/></pattern>
}
