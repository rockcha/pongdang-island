import {GoldIcon} from '@/features/gold/gold-provider'
import {productObject} from '@/features/gold/purchase-message'

export function TradeQuestion({name,price,selling=false}:{name:string;price:number;selling?:boolean}){
 return <><span className="block">{productObject(name)}</span><span className="mt-1 block"><span className="inline-flex items-center gap-1 whitespace-nowrap align-middle font-medium"><GoldIcon className="size-5"/><span>{price.toLocaleString('ko-KR')}</span><span className="sr-only">골드</span></span>에 {selling?'판매':'구매'}하시겠습니까?</span></>
}
