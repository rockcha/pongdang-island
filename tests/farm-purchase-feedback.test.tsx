import {StrictMode,useState} from 'react'
import {act,cleanup,fireEvent,render,screen} from '@testing-library/react'
import {MemoryRouter} from 'react-router'
import {afterEach,expect,it,vi} from 'vitest'
import {TopviewFarm} from '@/features/farm/topview-farm'
import {useFarmGoldSpend} from '@/features/farm/gold-spend'
import {initialTopview,type TopviewState,type FarmTool} from '@/features/farm/topview-model'
import {simulateFarm} from '@/features/farm/farm-simulation'
import {buyFarmItem,buyFarmTiles} from '@/features/farm/farm-stock'
import {buyLandStock} from '@/features/farm/land-tools'
import {playPurchaseSound} from '@/features/gold/purchase-sound'
vi.mock('@/features/gold/purchase-sound',()=>({playPurchaseSound:vi.fn(),playSaleSound:vi.fn()}))
afterEach(()=>{cleanup();vi.clearAllMocks();vi.useRealTimers()})

it.each([
 ['땅',500,(s:TopviewState)=>buyLandStock(s,5)],
 ['건물',1500,(s:TopviewState)=>buyFarmItem(s,'lab')],
 ['장식',900,(s:TopviewState)=>buyFarmItem(s,'duckBoat')],
 ['타일',50,(s:TopviewState)=>buyFarmTiles(s,5,'dirt')],
 ['종자',24,(s:TopviewState)=>simulateFarm(s,23,{type:'seed',good:'wheatSeed',quantity:2},0).state],
 ['비료',160,(s:TopviewState)=>simulateFarm(s,100,{type:'buySupply',supply:'fertilizer',quantity:2},0).state],
 ['동물',600,(s:TopviewState)=>simulateFarm(s,101,{type:'animal',animal:'chicken'},0).state],
 ['연구',1800,(s:TopviewState)=>simulateFarm(s,102,{type:'research',crop:'corn'},0).state],
 ['업그레이드',3000,(s:TopviewState)=>simulateFarm(s,103,{type:'upgrade'},0).state],
] as const)('shows the exact gold loss and one sound for %s',(_label,cost,purchase)=>{
 function Trial(){
  const [state,setState]=useState(()=>{const s=initialTopview();for(const [i,kind] of (['agriShop','coop','lab','mill'] as FarmTool[]).entries())s.objects.push({id:100+i,kind,x:5,y:8});return s})
  const spend=useFarmGoldSpend(state.gold)
  return <><button onClick={()=>setState(purchase(state))}>구매 실행</button>{spend.effect}</>
 }
 render(<StrictMode><Trial/></StrictMode>)
 fireEvent.click(screen.getByRole('button',{name:'구매 실행'}))
 expect(document.querySelector(`[data-farm-gold-spent="${cost}"]`)).toBeTruthy()
 expect(playPurchaseSound).toHaveBeenCalledTimes(1)
})

it.each(['땅','종자','건물'])('plays purchase feedback once through the actual %s UI',kind=>{
 vi.useFakeTimers();render(<MemoryRouter><TopviewFarm/></MemoryRouter>)
 const click=(name:string)=>fireEvent.click(screen.getByRole('button',{name,exact:true}))
 if(kind==='땅'){click('땅 0칸 보유');click('땅 구매하기');click('5칸 구매 · 500골드')}
 else if(kind==='종자'){fireEvent.click(screen.getByRole('button',{name:/^종자 상점 \(/}));click('밀 종자 구매')}
 else {click('상점');click('종자 연구소 구매 · 1500 G')}
 expect(document.querySelector(`[data-farm-gold-spent="${kind==='땅'?500:kind==='종자'?12:1500}"]`)).toBeTruthy()
 expect(playPurchaseSound).toHaveBeenCalledTimes(1)
 act(()=>vi.advanceTimersByTime(1400))
 expect(document.querySelector('.farm-gold-spend')).toBeNull()
})

it('does not celebrate a failed purchase',()=>{
 function Trial(){const [state,setState]=useState(()=>({...initialTopview(),gold:0})),spend=useFarmGoldSpend(state.gold);return <><button onClick={()=>setState(buyLandStock(state,1))}>구매</button>{spend.effect}</>}
 render(<Trial/>);fireEvent.click(screen.getByRole('button',{name:'구매'}))
 expect(document.querySelector('.farm-gold-spend')).toBeNull()
 expect(playPurchaseSound).not.toHaveBeenCalled()
})
