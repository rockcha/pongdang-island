import {GoldIcon} from '@/features/gold/gold-provider'

export function RelicGold({amount}:{amount:number}){
 return <span role="img" aria-label={`${amount.toLocaleString('ko-KR')} 골드`} className="inline-flex items-center gap-1 whitespace-nowrap tabular-nums"><GoldIcon className="size-4"/>{amount.toLocaleString('ko-KR')}</span>
}
