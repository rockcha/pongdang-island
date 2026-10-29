import {useId} from 'react'
import {floorTiles} from './island-model'
import sprites from './island-png-manifest.json'

export function FloorPatterns({prefix='island-floor'}:{prefix?:string}){
 return <defs>{floorTiles.map(tile=><pattern key={tile.id} id={`${prefix}-${tile.id}`} width="32" height="32" patternUnits="userSpaceOnUse"><image href={(sprites as Record<string,string>)['floor-'+tile.id]} width="32" height="32" preserveAspectRatio="none"/></pattern>)}</defs>
}
export function FloorSwatch({type}:{type:string}){
 const prefix='floor-preview-'+useId().replace(/:/g,'')
 return <svg viewBox="0 0 64 64" aria-hidden="true"><FloorPatterns prefix={prefix}/><rect x="3" y="3" width="58" height="58" rx="9" fill={`url(#${prefix}-${type})`} stroke="#fff6dd" strokeWidth="2"/></svg>
}