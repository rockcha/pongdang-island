import type {SVGProps} from 'react'
import {farmDiscardArt} from './discard-art'

export function FarmDiscardIcon(props:SVGProps<SVGSVGElement>){
 return <svg viewBox={farmDiscardArt.viewBox} aria-hidden="true" {...props}><image href={farmDiscardArt.path} width="512" height="512"/></svg>
}
