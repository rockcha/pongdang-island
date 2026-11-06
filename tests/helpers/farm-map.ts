import {MAP_W,MAP_H,TILE,FARM_SEA_MARGIN} from '@/features/farm/topview-model'

export const farmMapWidth=MAP_W*TILE+FARM_SEA_MARGIN*2
export const farmMapHeight=MAP_H*TILE+FARM_SEA_MARGIN*2
export const farmCellCenter=(cell:number)=>FARM_SEA_MARGIN+(cell+.5)*TILE
