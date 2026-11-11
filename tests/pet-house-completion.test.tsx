import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react'
import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import {createPetPreview,petPreviewReducer} from '@/features/pets/pet-preview-model'
const mocks=vi.hoisted(()=>({state:null as any,command:vi.fn()}))
vi.mock('@/lib/account-query',()=>({useAccountResource:()=>({data:mocks.state})}))
vi.mock('@/features/gold/gold-provider',()=>({useGold:()=>({wallet:{gold:10000,inventory:{}}})}))
vi.mock('@/features/pets/api',()=>({readPetHouse:vi.fn(),commandPetHouse:mocks.command,petError:()=> '통신 실패'}))
vi.mock('@/features/pets/pet-preview-page',()=>({PetPreviewBoard:({live}:any)=><><button onClick={()=>void live.send({type:'claim-job',id:live.state.pets[0].id})}>보상 받기</button>{live.completion&&<div role="status">{live.completion.pet.name} / {live.completion.reward} / {live.completion.pet.fullness} / {live.completion.pet.affection}</div>}</>}))
import {PetHousePage} from '@/features/pets/pet-house-page'
beforeEach(()=>{
 const now=Date.now()-7200000
 mocks.state=petPreviewReducer(createPetPreview(now),{type:'start-job',jobId:'sand-golem-clay',roll:0,now})
 vi.clearAllMocks()
})
afterEach(cleanup)
const returned=()=>({...mocks.state,pets:mocks.state.pets.map((p:any,i:number)=>i? p:{...p,job:null,fullness:87,affection:86})})
it('waits for confirmed payment and displays the server-returned pet status',async()=>{
 let finish!:(value:any)=>void
 mocks.command.mockReturnValueOnce(new Promise(resolve=>{finish=resolve}))
 render(<PetHousePage/>);fireEvent.click(screen.getByRole('button',{name:'보상 받기'}))
 expect(screen.queryByRole('status')).toBeNull()
 finish(returned())
 await waitFor(()=>expect(screen.getByRole('status').textContent).toBe('모래뭉 / 340 / 87 / 86'))
})
it('does not show a reward on failure and retains the original receipt through retry',async()=>{
 mocks.command.mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce(returned())
 render(<PetHousePage/>);fireEvent.click(screen.getByRole('button',{name:'보상 받기'}))
 const retry=await screen.findByRole('button',{name:'이전 요청 결과 다시 확인'})
 expect(screen.queryByRole('status')).toBeNull()
 fireEvent.click(retry)
 await waitFor(()=>expect(screen.getByRole('status').textContent).toContain('340'))
 expect(mocks.command.mock.calls[0]).toEqual(mocks.command.mock.calls[1])
})
