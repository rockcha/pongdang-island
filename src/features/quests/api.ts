import {createClient} from '@/lib/client'
export type QuestKind='daily'|'weekly'|'growth'
export type Quest={id:string;title:string;target:number;progress:number;claimed:boolean;complete:boolean;reward:number;rewardFuel?:number;href:string;icon:string}
export type QuestPeriod={kind:QuestKind;start:string;resetsAt:string|null;quests:Quest[];bonus:number;bonusReady:boolean;bonusClaimed:boolean}
export type QuestState={serverNow:string;daily:QuestPeriod;weekly:QuestPeriod;growth?:QuestPeriod;credited?:number;creditedFuel?:number}
export async function loadQuests():Promise<QuestState>{const {data,error}=await createClient().rpc('quest_state');if(error)throw error;return data}
export async function claimQuest(kind:QuestKind,start:string,id:string):Promise<QuestState>{const {data,error}=await createClient().rpc('claim_quest',{p_kind:kind,p_start:start,p_quest_id:id});if(error)throw error;return data}
export function questError(cause:unknown){const message=String((cause as {message?:string})?.message??'');
 if(message.includes('QUEST_PERIOD_CHANGED'))return '퀘스트가 새로 시작됐어요. 갱신된 목록을 확인해주세요.'
 if(message.includes('QUEST_INCOMPLETE'))return '아직 완료하지 않은 퀘스트예요. 진행도를 다시 확인해주세요.'
 if(message.includes('GOLD_LIMIT'))return '골드 보유 한도에 도달했어요. 골드를 사용한 뒤 받아주세요.'
 if(message.includes('FUEL_LIMIT'))return '연료 보유 한도에 도달했어요. 연료를 사용한 뒤 받아주세요.'
 return '퀘스트를 확인하지 못했어요. 다시 시도해주세요.'
}
