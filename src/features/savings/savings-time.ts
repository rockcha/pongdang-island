import type {SavingsAccount} from './api'
export function savingsStatus(account:SavingsAccount,now:number):SavingsAccount['status']{
 if(account.closed_at)return 'closed'
 if(account.paid_count===account.term_days)return now>=Date.parse(account.maturesAt)?'matured':'waiting'
 if(account.depositDeadline&&now>=Date.parse(account.depositDeadline))return 'missed'
 return account.nextOpenAt&&now>=Date.parse(account.nextOpenAt)?'due':'waiting'
}
export function remainingTime(target:string,now:number){
 const seconds=Math.max(0,Math.ceil((Date.parse(target)-now)/1000))
 const hours=Math.floor(seconds/3600),minutes=Math.floor(seconds%3600/60),rest=seconds%60
 return `${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')}:${String(rest).padStart(2,'0')}`
}
