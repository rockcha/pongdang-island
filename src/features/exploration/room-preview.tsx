import {shopkeepers,shopTierLabels} from './shopkeepers'
import {adventureRooms} from './adventure-rooms'
export const roomTypes=[
 {id:'guardian',name:'중급 수호자 방',mark:'⚔',title:'왕릉의 수호자'},
 {id:'monster',name:'몬스터 방',mark:'⚔',title:'왕릉의 수호자'},
 ...adventureRooms.map(room=>({id:room.id,name:room.name,mark:room.kind==='rest'?'☾':room.kind==='scales'?'⚖':room.kind==='sphinx'?'𓃭':'◈',title:room.title})),
 ...shopkeepers.map(profile=>({id:profile.roomId,name:`${profile.name} · ${shopTierLabels[profile.tier]} ${profile.kind==='equipment'?'장비':'마법'}`,mark:profile.kind==='equipment'?'⚖':'✧',title:profile.name})),
] as const
export type RoomTypeId=typeof roomTypes[number]['id']
