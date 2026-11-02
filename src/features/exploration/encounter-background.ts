import {getAdventureRoom} from './adventure-rooms'
import type {PracticeState} from './practice-state'

/** A room-triggered encounter keeps its room, including after a run is reloaded. */
export function encounterRoomBackdrop(state:PracticeState){
 if(state.door===null)return undefined
 const id=state.market.doors[state.door]
 const room=id?getAdventureRoom(id):undefined
 return room&&['chest','investigate','giant','thief'].includes(room.kind)?room.background:undefined
}
