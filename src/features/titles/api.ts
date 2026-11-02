import {createClient} from '@/lib/client'
import {readAccountResource,invalidateAccountResource} from '@/lib/account-cache'
import {accountCommand} from '@/lib/account-command'
export type PlayerTitle={id:string;name:string;tier:1|2|3|4;category:'growth'|'moment'|'collection'|'social'|'arcade';description:string|null;target:number|null;progress:number|null;extra_target:number|null;extraProgress:number|null;earnedAt:string|null}
export type TitleState={equipped:string|null;titles:PlayerTitle[]}
export async function readTitles(signal:AbortSignal):Promise<TitleState>{const {data,error}=await createClient().rpc('title_state').abortSignal(signal);if(error)throw error;return data}
export function loadTitles():Promise<TitleState>{return readAccountResource('titles',readTitles)}
export function equipTitle(id:string|null):Promise<TitleState>{return accountCommand(async()=>{const {data,error}=await createClient().rpc('equip_title',{p_title:id});if(error)throw error;return data},{resource:'titles'})}
export function syncTitles():Promise<number>{return accountCommand(async()=>{const {data,error}=await createClient().rpc('sync_titles');if(error)throw error;return data},{after:count=>{if(count>0){invalidateAccountResource('titles');invalidateAccountResource('inbox')}}})}
