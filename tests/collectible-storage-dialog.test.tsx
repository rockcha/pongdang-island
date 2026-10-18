import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react'
import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import {CollectibleStorageDialog} from '../src/features/aquarium/collectible-storage-dialog'
import type {AquariumState} from '../src/features/aquarium/api'
import type {OwnedCollectible} from '../src/features/collection/api'

const mock=vi.hoisted(()=>({load:vi.fn()}))
vi.mock('@/features/aquarium/api',async original=>({...await original<typeof import('../src/features/aquarium/api')>(),loadCollectibleStorage:mock.load}))
vi.mock('@/features/collection/collectible-thumbnail',()=>({CollectibleThumbnail:()=>null}))
const stored=[{id:'fish',species_id:'fish',species:{id:'fish',kind:'fish',sell_price:40,name:'멸치',thumbnail_path:'fish.png'}},{id:'decoration',species_id:'decoration',species:{id:'decoration',kind:'decoration',sell_price:20,name:'불가사리',thumbnail_path:'star.png'}}] as OwnedCollectible[]
const state={inhabitants:[],storageCount:2,tankCapacity:50,tanks:[{id:'tank-a',name:'첫 어항'},{id:'tank-b',name:'두 번째 어항'}]} as unknown as AquariumState
beforeEach(()=>{mock.load.mockReset();mock.load.mockResolvedValue({items:stored,total:2,pageSize:50})})
afterEach(cleanup)
it('shows an icon badge and batches several selected individuals into the current tank',async()=>{
 const assign=vi.fn(async()=>{})
 render(<CollectibleStorageDialog state={state} currentTankId="tank-a" busy={false} onAssign={assign}/>)
 expect(mock.load).not.toHaveBeenCalled()
 fireEvent.click(screen.getByRole('button',{name:'보관함 2개'}))
 await screen.findByText('멸치')
 fireEvent.click(screen.getByRole('button',{name:'멸치 선택'}))
 fireEvent.click(screen.getByRole('button',{name:'불가사리 선택'}))
 fireEvent.click(screen.getByRole('button',{name:'2개 어항에 넣기'}))
 fireEvent.click(screen.getByRole('button',{name:'확인'}))
 await waitFor(()=>expect(assign).toHaveBeenCalledWith(['fish','decoration'],'tank-a'))
})
it('blocks over-capacity selection until enough items are deselected',async()=>{
 const occupied={...state,inhabitants:Array.from({length:49},(_,i)=>({id:String(i),tank_id:'tank-a'} as OwnedCollectible))}
 render(<CollectibleStorageDialog state={occupied} currentTankId="tank-a" busy={false} onAssign={async()=>{}}/>)
 fireEvent.click(screen.getByRole('button',{name:'보관함 2개'}))
 await screen.findByText('멸치')
 fireEvent.click(screen.getByRole('button',{name:'멸치 선택'}))
 fireEvent.click(screen.getByRole('button',{name:'불가사리 선택'}))
 expect(screen.getByRole('button',{name:'2개 어항에 넣기'})).toHaveProperty('disabled',true)
 fireEvent.click(screen.getByRole('button',{name:'불가사리 선택'}))
 expect(screen.getByRole('button',{name:'1개 어항에 넣기'})).toHaveProperty('disabled',false)
})
it('keeps selection and displays an actionable error when assignment fails',async()=>{
 const assign=vi.fn(async()=>{throw new Error('TANK_FULL')})
 render(<CollectibleStorageDialog state={state} currentTankId="tank-a" busy={false} onAssign={assign}/>)
 fireEvent.click(screen.getByRole('button',{name:'보관함 2개'}))
 await screen.findByText('멸치')
 fireEvent.click(screen.getByRole('button',{name:/멸치 선택/}))
 fireEvent.click(screen.getByRole('button',{name:'1개 어항에 넣기'}))
 fireEvent.click(screen.getByRole('button',{name:'확인'}))
 expect((await screen.findByRole('alert')).textContent).toContain('50개')
 fireEvent.click(screen.getByRole('button',{name:'취소'}))
 await waitFor(()=>expect(screen.queryByRole('alertdialog')).toBeNull())
 expect(screen.getByRole('button',{name:/멸치 선택/})).toHaveProperty('ariaPressed','true')
})

it('groups stored duplicates and assigns exactly the entered quantity',async()=>{
 mock.load.mockResolvedValue({items:[...stored,{...stored[0],id:'fish-2'},{...stored[0],id:'fish-3'}],total:4,pageSize:50})
 const assign=vi.fn(async(_ids:string[],_tank:string)=>{})
 render(<CollectibleStorageDialog state={state} currentTankId="tank-a" busy={false} onAssign={assign}/>)
 fireEvent.click(screen.getByRole('button',{name:'보관함 2개'}))
 await screen.findByText('멸치')
 expect(screen.queryByPlaceholderText('이름으로 찾기')).toBeNull()
 expect(screen.queryByRole('button',{name:'전체 선택'})).toBeNull()
 fireEvent.change(screen.getByRole('textbox',{name:'멸치 선택 수량'}),{target:{value:'2'}})
 fireEvent.click(screen.getByRole('button',{name:'2개 어항에 넣기'}))
 fireEvent.click(screen.getByRole('button',{name:'확인'}))
 await waitFor(()=>expect(assign).toHaveBeenCalledWith(['fish','fish-2'],'tank-a'))
})

it('confirms the sale of exactly the selected stored individuals',async()=>{
 const onSell=vi.fn(async(_ids:string[])=>{})
 render(<CollectibleStorageDialog state={state} currentTankId="tank-a" busy={false} onAssign={async()=>{}} onSell={onSell}/> )
 fireEvent.click(screen.getByRole('button',{name:'보관함 2개'}))
 await screen.findByText('멸치')
 fireEvent.click(screen.getByRole('button',{name:'멸치 선택'}))
 fireEvent.click(screen.getByRole('button',{name:'선택한 개체 판매 40 골드'}))
 expect(onSell).not.toHaveBeenCalled()
 fireEvent.click(screen.getByRole('button',{name:'확인'}))
 await waitFor(()=>expect(onSell).toHaveBeenCalledWith(['fish']))
})
