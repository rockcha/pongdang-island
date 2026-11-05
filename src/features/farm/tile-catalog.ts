import type {TopviewState} from './topview-model'

export const farmTiles=[{id:'dirt',name:'흙길',price:10},{id:'stone',name:'징검돌 길',price:20},{id:'deck',name:'나무 데크',price:25},{id:'brick',name:'붉은 벽돌길',price:25},{id:'sand',name:'밝은 모래길',price:15},{id:'flagstone',name:'밝은 판석길',price:30}] as const
export type FarmTile=typeof farmTiles[number]['id']
export const tileCount=(state:TopviewState,tile:FarmTile)=>tile==='dirt'?state.tileStock:state.tileStocks?.[tile]??0
export const totalTiles=(state:TopviewState)=>farmTiles.reduce((sum,tile)=>sum+tileCount(state,tile.id),0)
export const pathTile=(state:TopviewState,key:string):FarmTile=>state.pathTiles?.[key]??'dirt'
export function addTileStock(state:TopviewState,tile:FarmTile,quantity:number):TopviewState{
 return tile==='dirt'?{...state,tileStock:state.tileStock+quantity}:{...state,tileStocks:{...state.tileStocks,[tile]:tileCount(state,tile)+quantity}}
}
