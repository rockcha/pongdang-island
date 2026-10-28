import {useState} from 'react'
import {cleanup,fireEvent,render,screen,waitFor,within} from '@testing-library/react'
import {MemoryRouter} from 'react-router'
import {afterEach,expect,it,vi} from 'vitest'
import {FacilityShop} from '@/features/production/facility-shop'
import type {ProductionFacility} from '@/features/production/api'
import type {BaitFacility} from '@/features/production/bait-production-api'
vi.mock('@/features/gold/gold-provider',()=>({GoldIcon:()=>null}))
afterEach(cleanup)
const common={description:'바다 자원으로 다음 항해를 준비해요.',price:300,output_count:5,production_minutes:80,storage_minutes:120,image_path:'/facility.png',startedAt:null,completesAt:null,expiresAt:null,runOutput:null}
const fuel:ProductionFacility={...common,id:'fuel',name:'작은 재활용소',kind:'trash',input_count:3,enabled:true,owned:true,ownedCount:2}
const bait:BaitFacility={...common,id:'bait',name:'미끼 공방',bait_id:'worm',baitName:'지렁이',fuel_cost:2,ownedCount:2}
function Shop({kind='fuel',gold=1000,pending=false,onBuy=vi.fn(),onRetry=vi.fn()}:{kind?:'fuel'|'bait';gold?:number;pending?:boolean;onBuy?:(id:string,n:number)=>void;onRetry?:()=>void}){
 const [selected,setSelected]=useState<string|null>(null)
 const facilities=kind==='fuel'?[fuel,{...fuel,id:'fish',name:'어유 정제소',kind:'fish' as const,owned:false,ownedCount:0}]:[bait,{...bait,id:'shrimp',name:'새우 공방',bait_id:'shrimp',baitName:'새우',ownedCount:0}]
 return <MemoryRouter><FacilityShop kind={kind} facilities={facilities} gold={gold} fuel={10} loading={false} error={pending?'결과를 확인해 주세요.':''} busy={false} pending={pending&&selected!==null} selectedId={selected} onSelect={setSelected} onBuy={(id,n)=>{onBuy(id,n);setSelected(null)}} onRetry={onRetry}/></MemoryRouter>
}
it.each(['fuel','bait'] as const)('quotes quantity and ownership and links to owned %s facilities after buying',async kind=>{
 const buy=vi.fn();render(<Shop kind={kind} onBuy={buy}/>)
 const name=kind==='fuel'?fuel.name:bait.name
 const card=screen.getByRole('button',{name:name+' 상세 보기'})
 expect(within(card).getByLabelText('생산 시간 1시간 20분').textContent).toBe('80분')
 expect(within(card).getByLabelText('완료 후 보관 기간 2시간')).toBeTruthy()
 fireEvent.click(card)
 expect(screen.getByRole('dialog').textContent).toContain('완료 후 보관 기간')
 expect(screen.getByRole('dialog').textContent).toContain('1회 생산량')
 fireEvent.click(screen.getByRole('button',{name:'구매 수량 늘리기'}))
 expect(screen.queryByLabelText('구매 후 보유 수량')).toBeNull()
 fireEvent.change(screen.getByRole('spinbutton',{name:'구매 수량'}),{target:{value:'99'}})
 expect(screen.getByRole('spinbutton',{name:'구매 수량'})).toHaveProperty('value','3')
 fireEvent.click(screen.getByRole('button',{name:'900골드로 구매'}))
 expect(buy).toHaveBeenCalledExactlyOnceWith(kind,3)
 expect(await screen.findByRole('link',{name:'내 생산소 보기'})).toHaveProperty('pathname',kind==='fuel'?'/production':'/bait-production')
})
it('combines production type and ownership filters and resets empty results',async()=>{
 render(<Shop kind="bait"/>)
 fireEvent.click(screen.getByRole('combobox',{name:'생산 미끼 선택'}))
 const shrimp=await screen.findByRole('option',{name:'새우'})
 expect(shrimp.querySelector('img')?.getAttribute('src')).toBe(bait.image_path)
 fireEvent.keyDown(shrimp,{key:'Enter'})
 await waitFor(()=>expect(screen.queryByRole('listbox')).toBeNull())
 const selected=screen.getByRole('combobox',{name:'생산 미끼 선택'})
 expect(selected.textContent).toContain('새우')
 expect(selected.querySelector('img')?.getAttribute('src')).toBe(bait.image_path)
 expect(screen.queryByRole('button',{name:'미끼 공방 상세 보기'})).toBeNull()
 fireEvent.click(screen.getByRole('combobox',{name:'생산소 보유 필터'}))
 fireEvent.keyDown(await screen.findByRole('option',{name:'보유한 생산소'}),{key:'Enter'})
 await waitFor(()=>expect(screen.queryByRole('listbox')).toBeNull())
 expect(screen.getByText('조건에 맞는 생산소가 없어요.')).toBeTruthy()
 fireEvent.click(screen.getByRole('button',{name:'검색·필터 초기화'}))
 expect(screen.getAllByRole('article')).toHaveLength(2)
 expect(screen.queryByRole('searchbox')).toBeNull()
})
it('switches full-width fuel categories using tabs and keyboard navigation',()=>{
 render(<Shop/>)
 const recycling=screen.getByRole('tab',{name:'재활용'}),refinery=screen.getByRole('tab',{name:'어유 정제'})
 expect(recycling.getAttribute('aria-selected')).toBe('true')
 expect(screen.queryByRole('combobox',{name:'소모 재료 선택'})).toBeNull()
 expect(screen.queryByRole('button',{name:'어유 정제소 상세 보기'})).toBeNull()
 fireEvent.keyDown(recycling,{key:'ArrowRight'})
 expect(refinery.getAttribute('aria-selected')).toBe('true')
 expect(document.activeElement).toBe(refinery)
 expect(screen.getByRole('button',{name:'어유 정제소 상세 보기'})).toBeTruthy()
 expect(screen.queryByRole('button',{name:'작은 재활용소 상세 보기'})).toBeNull()
 fireEvent.keyDown(refinery,{key:'Home'})
 expect(recycling.getAttribute('aria-selected')).toBe('true')
})
it('locks purchase quantity for an uncertain result and retries instead of issuing another buy',()=>{
 const retry=vi.fn(),buy=vi.fn();render(<Shop pending onBuy={buy} onRetry={retry}/>)
 fireEvent.click(screen.getByRole('button',{name:'작은 재활용소 상세 보기'}))
 expect(screen.getByRole('spinbutton',{name:'구매 수량'})).toHaveProperty('disabled',true)
 fireEvent.click(screen.getByRole('button',{name:'구매 결과 다시 확인'}))
 expect(retry).toHaveBeenCalledTimes(1);expect(buy).not.toHaveBeenCalled()
})
