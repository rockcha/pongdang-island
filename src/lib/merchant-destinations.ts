import {placeSections} from './place-sections'

const artwork:Record<string,{thumbnail:string;banner:string;description:string;upcoming?:boolean}>={
 '/shop':{thumbnail:'shop-thumbnail',banner:'merchant-shop',description:'낚싯대와 미끼가 진열된 햇살 가득한 해변 상점'},
 '/merchant-street/exchange':{thumbnail:'exchange-thumbnail',banner:'merchant-exchange',description:'청록 차양과 저울이 놓인 바닷가 거래소'},
 '/merchant-street/auctions':{thumbnail:'auction-thumbnail',banner:'merchant-auction',description:'경매 망치와 바다의 보물이 전시된 작은 경매소'},
}
export const merchantDestinations=placeSections.merchants.items.map(item=>({...item,...artwork[item.path]}))
