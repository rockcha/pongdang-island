import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react'
import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import {CollectibleStorageDialog} from '../src/features/aquarium/collectible-storage-dialog'
import type {AquariumState} from '../src/features/aquarium/api'
import type {OwnedCollectible} from '../src/features/collection/api'

const mock=vi.hoisted(()=>({load:vi.fn()}))
vi.mock('@/features/aquarium/api',async original=>({...await original<typeof import('../src/features/aquarium/api')>(),loadCollectibleStorage:mock.load}))
vi.mock('@/features/collection/collectible-thumbnail',()=>({CollectibleThumbnail:()=>null}))
const stored=[{id:'fish',species:{name:'멸치',thumbnail_path:'fish.png'}},{id:'decoration',species:{name:'불가사리',thumbnail_path:'star.png'}}] as OwnedCollectible[]
const state={inhabitants:[],storageCount:2,tankCapacity:50,tanks:[{id:'tank-a',name:'첫 어항'},{id:'tank-b',name:'두 번째 어항'}]} as unknown as AquariumState
beforeEach(()=>{mock.load.mockReset();mock.load.mockResolvedValue({items:stored,total:2,pageSize:50})})
afterEach(cleanup)
it('shows an icon badge and batches several selected individuals into the chosen tank',async()=>{
 const assign=vi.fn(async()=>{})
 render(<CollectibleStorageDialog state={state} currentTankId="tank-a" busy={false} onAssign={assign}/>)
 expect(mock.load).not.toHaveBeenCalled()
 fireEvent.click(screen.getByRole('button',{name:'보관함 2개'}))
 await screen.findByText('멸치')
 fireEvent.click(screen.getByRole('button',{name:/멸치 선택/}))
 fireEvent.click(screen.getByRole('button',{name:/불가사리 선택/}))
 fireEvent.change(screen.getByLabelText('넣을 어항'),{target:{value:'tank-b'}})
 fireEvent.click(screen.getByRole('button',{name:'2개 어항에 넣기'}))
 await waitFor(()=>expect(assign).toHaveBeenCalledWith(['fish','decoration'],'tank-b'))
})
it('blocks over-capacity selection but allows choosing a different tank',async()=>{
 const occupied={...state,inhabitants:Array.from({length:49},(_,i)=>({id:String(i),tank_id:'tank-a'} as OwnedCollectible))}
 render(<CollectibleStorageDialog state={occupied} currentTankId="tank-a" busy={false} onAssign={async()=>{}}/>)
 fireEvent.click(screen.getByRole('button',{name:'보관함 2개'}))
 await screen.findByText('멸치')
 fireEvent.click(screen.getByRole('button',{name:'이 화면 선택'}))
 expect(screen.getByRole('button',{name:'2개 어항에 넣기'})).toHaveProperty('disabled',true)
 expect(screen.getByText('이 어항에는 1개만 더 넣을 수 있어요.')).toBeTruthy()
 fireEvent.change(screen.getByLabelText('넣을 어항'),{target:{value:'tank-b'}})
 expect(screen.getByRole('button',{name:'2개 어항에 넣기'})).toHaveProperty('disabled',false)
})
it('keeps selection and displays an actionable error when assignment fails',async()=>{
 const assign=vi.fn(async()=>{throw new Error('TANK_FULL')})
 render(<CollectibleStorageDialog state={state} currentTankId="tank-a" busy={false} onAssign={assign}/>)
 fireEvent.click(screen.getByRole('button',{name:'보관함 2개'}))
 await screen.findByText('멸치')
 fireEvent.click(screen.getByRole('button',{name:/멸치 선택/}))
 fireEvent.click(screen.getByRole('button',{name:'1개 어항에 넣기'}))
 expect((await screen.findByRole('alert')).textContent).toContain('50개')
 expect(screen.getByRole('button',{name:/멸치 선택/})).toHaveProperty('ariaPressed','true')
})
