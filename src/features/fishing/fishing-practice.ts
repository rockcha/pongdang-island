import type { Rarity } from '@/lib/game/rarity'
import type { Species } from '@/features/collection/api'
// Local-only practice: never passed to a reward RPC.
const demos:Record<Rarity,[string,string,string]>={
 common:['bean-pufferfish','콩알 복어','normal'],
 rare:['blue-dolphin','푸른 돌고래','rare'],
 epic:['starpattern-manta','별무늬 만타','epic'],
 mythic:['dawn-narwhal','새벽을 여는 일각고래','mythic'],
}
export function practiceSpecies(rarity:Rarity):Species{
 const [id,name,folder]=demos[rarity]
 return {id,name,kind:'fish',description:'등급별 힘 조절 연습',rarity,thumbnail_path:`fish/${folder}/${id}_thumbnail.png`,sprite_sheet_path:null,swim_y_min:.2,swim_y_max:.8,speed:.03,size:80,sell_price:0}
}
export const plannedFailureMessages={bait:'미끼만 쏙 먹고 달아났어요.',escape:'물고기가 바늘에서 빠져나갔어요.',wave:'거센 물결에 물고기를 놓쳤어요.'}
