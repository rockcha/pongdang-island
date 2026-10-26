import {useState} from 'react'
import {createRoot} from 'react-dom/client'
import {MemoryRouter} from 'react-router'
import {PlaceBanner} from '/src/components/place-banner'
import {SavingsAccountPanel,SavingsHistory,SavingsPlanPanel} from '/src/features/savings/savings-panels'
import type {SavingsAccount} from '/src/features/savings/api'
import '/src/index.css'
import '/src/features/savings/savings.css'
const plans=[{days:3 as const,bonus:20},{days:5 as const,bonus:25},{days:7 as const,bonus:30}]
const now=Date.now(),stamp=(hours:number)=>new Date(now+hours*3600000).toISOString()
const mode=new URLSearchParams(location.search).get('state')??'due'
if(new URLSearchParams(location.search).has('dark'))document.documentElement.classList.add('dark')
const initial:SavingsAccount={id:'preview',term_days:5,daily_amount:500,paid_count:3,started_at:stamp(-72),closed_at:null,close_kind:null,payout:null,principal:1500,bonusPercent:25,expectedBonus:625,expectedPayout:3125,maturesAt:stamp(48),nextOpenAt:stamp(-1),depositDeadline:stamp(8),status:'due'}
function Preview(){
 const [account,setAccount]=useState({...initial,...(mode==='waiting'?{status:'waiting',nextOpenAt:stamp(12)}:mode==='full'?{status:'waiting',paid_count:5,principal:2500,nextOpenAt:null,depositDeadline:null}:mode==='matured'?{status:'matured',paid_count:5,principal:2500,maturesAt:stamp(-1),nextOpenAt:null,depositDeadline:null}:mode==='missed'?{status:'missed',depositDeadline:stamp(-1)}:mode==='urgent'?{depositDeadline:stamp(.5)}:{})} as SavingsAccount)
 const [amount,setAmount]=useState('100'),[term,setTerm]=useState<3|5|7>(3)
 const [notice,setNotice]=useState('')
 const valid=/^\d+$/.test(amount)&&Number(amount)>=10&&Number(amount)<=5000,principal=valid?Number(amount)*term:0,percent=plans.find(p=>p.days===term)!.bonus,bonus=Math.floor(principal*percent/100)
 return <MemoryRouter><div className="app-shell mx-auto flex h-dvh max-w-md flex-col overflow-hidden px-6 sm:max-w-[390px]"><header className="-mx-6 shrink-0 border-b bg-background px-4 py-3"><div className="flex items-center justify-between"><span className="text-sm text-primary">퐁당섬</span><span className="text-xs">⭐ 5,000</span></div><div className="mt-3 flex justify-between text-xs text-muted-foreground"><span>내 섬</span><span>바다</span><span className="text-primary">생활⌄</span><span>장터</span><span>광장</span></div></header><PlaceBanner pathname="/savings"/><main className="-mx-6 flex min-h-0 flex-1 flex-col overflow-hidden"><section className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 pb-6 pt-4">{mode==='form'?<SavingsPlanPanel plans={plans} term={term} onTerm={setTerm} amount={amount} onAmount={setAmount} valid={valid} disabled={false} gold={5000} principal={principal} bonus={bonus} bonusPercent={percent} onStart={()=>setNotice('확인 화면으로 이동')}/>:<SavingsAccountPanel account={account} status={account.status} now={now} gold={5000} disabled={false} onDeposit={()=>{setAccount({...account,paid_count:4,principal:2000,status:'waiting',nextOpenAt:stamp(24)})}} onWithdraw={()=>setNotice('수령 요청')} onCancel={()=>setNotice('해지 확인 요청')}/>}<SavingsHistory items={[{...initial,id:'history',status:'closed',closed_at:stamp(-72),close_kind:'matured',payout:3125}]}/>{notice&&<p role="status">{notice}</p>}</section></main></div></MemoryRouter>
}
createRoot(document.getElementById('root')!).render(<Preview/>)
