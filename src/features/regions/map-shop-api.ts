import {createClient} from '@/lib/client'
export type MapProduct={region_id:string;name:string;description:string;price:number;thumbnail_path:string;owned:boolean}
export type MapShopState={items:MapProduct[]}
export async function loadMapShop(){const {data,error}=await createClient().rpc('map_shop_state');if(error)throw error;return data}
