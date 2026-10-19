import {createClient} from '@/lib/client'
import type {MusicTrack} from './music-library'
export async function loadMusic(imported:MusicTrack[]|null){
 const {data,error}=await createClient().rpc('music_library',{p_import:imported})
 if(error)throw error
 return data
}
export async function editMusic(action:'add'|'rename'|'delete'|'title',id:string,title='',name=''){
 const {data,error}=await createClient().rpc('music_edit',{p_action:action,p_id:id,p_title:title,p_name:name})
 if(error)throw error
 return data
}
