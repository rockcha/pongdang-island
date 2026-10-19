import {createClient} from '@/lib/client'
export type PlayerTitle={id:string;name:string;tier:1|2|3|4;category:'growth'|'moment'|'collection'|'social';description:string|null;target:number|null;progress:number|null;extra_target:number|null;extraProgress:number|null;earnedAt:string|null}
export type TitleState={equipped:string|null;titles:PlayerTitle[]}
export async function loadTitles():Promise<TitleState>{const {data,error}=await createClient().rpc('title_state');if(error)throw error;return data}
export async function equipTitle(id:string|null):Promise<TitleState>{const {data,error}=await createClient().rpc('equip_title',{p_title:id});if(error)throw error;return data}
export async function syncTitles():Promise<number>{const {data,error}=await createClient().rpc('sync_titles');if(error)throw error;return data}
