import {createContext} from 'react'
export type TankAssetState='loading'|'ready'|'failed'
export const TankLoadingContext=createContext<((state:TankAssetState)=>void)|null>(null)
