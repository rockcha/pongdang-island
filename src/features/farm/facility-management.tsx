import {BuildingStoreButton} from './building-store-button'
import type {ComponentProps} from 'react'

export function FacilityManagement(props:ComponentProps<typeof BuildingStoreButton>){
 return <details className="farm-facility-management"><summary aria-label="건물 관리">⋯ 건물 관리</summary><BuildingStoreButton {...props}/></details>
}
