import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react'
import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import {MemoryRouter,Route,Routes} from 'react-router'
import {FirstFishingGate} from '@/features/onboarding/first-fishing-gate'
import {FirstFishingPage} from '@/features/onboarding/first-fishing-page'
const mock=vi.hoisted(()=>({api:vi.fn()}))
vi.mock('@/components/auth-provider',()=>({useAuth:()=>({session:{user:{id:'new-player'}}})}))
vi.mock('@/features/onboarding/api',async original=>({...await original<typeof import('@/features/onboarding/api')>(),firstFishingTutorial:mock.api}))
vi.mock('@/features/fishing/tension-fishing-game',()=>({TensionFishingGame:({onCaught,onFailed}:any)=><div><button onClick={onCaught}>낚시 성공</button><button onClick={onFailed}>낚시 실패</button></div>}))
vi.mock('@/features/collection/collectible-preview',()=>({CollectiblePreview:()=>null}))
vi.mock('@/features/collection/collectible-thumbnail',()=>({CollectibleThumbnail:()=>null}))
vi.mock('@/features/aquarium/tank-inhabitants',()=>({TankInhabitants:()=>null}))
vi.mock('@/features/aquarium/aquarium-backdrop',()=>({AquariumBackdrop:()=>null}))
const species={id:'pongdang-pufferfish',name:'퐁당 복어',thumbnail_path:'fish.png',rarity:'rare',kind:'fish'}
const ready={required:true,step:'ready',species,item:null,tank:{id:'one',name:'나의 첫 어항'},aquarium:null}
const caught={...ready,step:'caught',item:{id:'only-fish',species_id:species.id,species,tank_id:null}}
const completed={...caught,required:false,step:'completed',item:{...caught.item,tank_id:'one'},aquarium:{catalog:[]}}
beforeEach(()=>{mock.api.mockReset();mock.api.mockImplementation(async(action:string)=>action==='state'?ready:action==='start'?{...ready,step:'fishing'}:action==='catch'?caught:completed)})
afterEach(cleanup)
function show(path='/aquarium'){return render(<MemoryRouter initialEntries={[path]}><Routes><Route element={<FirstFishingGate/>}><Route path="first-fishing" element={<FirstFishingPage/>}/><Route path="aquarium" element={<p>자유 어항</p>}/></Route></Routes></MemoryRouter>)}
it('requires a new player to catch and select the actual first fish before placing it and unlocking the aquarium',async()=>{
 show();await screen.findByText('첫 낚시를 해볼까요?')
 expect(screen.queryByText('자유 어항')).toBeNull()
 fireEvent.click(screen.getByRole('button',{name:'첫 낚시 시작'}))
 fireEvent.click(await screen.findByRole('button',{name:'낚시 성공'}))
 await screen.findByText('퐁당 복어 획득!')
 fireEvent.click(screen.getByRole('button',{name:'첫 어항에 데려가기'}))
 expect(screen.getByRole('button',{name:'어항에 넣기'})).toHaveProperty('disabled',true)
 expect(screen.queryByRole('button',{name:/판매|선물|건너뛰기/})).toBeNull()
 fireEvent.click(screen.getByRole('button',{name:'퐁당 복어 선택'}))
 fireEvent.click(screen.getByRole('button',{name:'어항에 넣기'}))
 await screen.findByText('첫 바다 친구가 생겼어요!')
 fireEvent.click(screen.getByRole('button',{name:'내 어항 보러 가기'}))
 await screen.findByText('자유 어항')
 expect(mock.api.mock.calls.map(c=>c[0])).toEqual(['state','start','catch','place'])
})
it('exempts an existing player and resumes an interrupted catch without starting or awarding again',async()=>{
 mock.api.mockResolvedValueOnce({...ready,required:false,step:'inactive'})
 const view=show();await screen.findByText('자유 어항');view.unmount()
 mock.api.mockResolvedValueOnce(caught)
 show();await screen.findByText('퐁당 복어 획득!')
 expect(mock.api.mock.calls.map(c=>c[0])).toEqual(['state','state'])
})
it('offers free retries after minigame failure and lets a lost award response be checked again',async()=>{
 show();await screen.findByText('첫 낚시를 해볼까요?')
 fireEvent.click(screen.getByRole('button',{name:'첫 낚시 시작'}))
 fireEvent.click(await screen.findByRole('button',{name:'낚시 실패'}))
 fireEvent.click(screen.getByRole('button',{name:'다시 도전하기'}))
 mock.api.mockRejectedValueOnce(new Error('offline'))
 fireEvent.click(screen.getByRole('button',{name:'낚시 성공'}))
 await screen.findByRole('alert')
 fireEvent.click(screen.getByRole('button',{name:'획득 다시 확인'}))
 await screen.findByText('퐁당 복어 획득!')
 expect(mock.api.mock.calls.map(c=>c[0])).toEqual(['state','start','catch','catch'])
})
it('keeps the chosen fish after placement fails and retries without restarting the tutorial',async()=>{
 mock.api.mockResolvedValueOnce(caught)
 show();await screen.findByText('퐁당 복어 획득!')
 fireEvent.click(screen.getByRole('button',{name:'첫 어항에 데려가기'}))
 fireEvent.click(screen.getByRole('button',{name:'퐁당 복어 선택'}))
 mock.api.mockRejectedValueOnce(new Error('offline'))
 fireEvent.click(screen.getByRole('button',{name:'어항에 넣기'}))
 await screen.findByRole('alert')
 expect(screen.getByRole('button',{name:'퐁당 복어 선택'}).getAttribute('aria-pressed')).toBe('true')
 fireEvent.click(screen.getByRole('button',{name:'어항에 넣기'}))
 await screen.findByText('첫 바다 친구가 생겼어요!')
 await waitFor(()=>expect(mock.api.mock.calls.map(c=>c[0])).toEqual(['state','place','place']))
})
