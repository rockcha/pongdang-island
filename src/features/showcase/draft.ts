import type {Species} from '@/features/collection/api'
import {randomId} from '@/lib/random-id'

export type ShowcaseDraft={id:string;owner:string;operationId:string;source?:'trap'|'harbor';tripId?:string;species:Species;regionName:string;caughtAt:string;firstDiscovery:boolean;renderVersion:1;preview:boolean;caption:string}
let current:ShowcaseDraft|null=null
let preview:ShowcaseDraft|null=null
export function savePreviewShowcase(value:ShowcaseDraft){preview=value}
export function getPreviewShowcase(owner:string){return preview?.owner===owner?preview:null}
export function startShowcaseDraft(input:Omit<ShowcaseDraft,'id'|'caption'>){
 current={...input,id:randomId(),caption:''}
 return current.id
}
export function getShowcaseDraft(owner:string,id:unknown){return current?.owner===owner&&current.id===id?current:null}
export function clearShowcaseDraft(id:string){if(current?.id===id)current=null}
