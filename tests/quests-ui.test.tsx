import {act,cleanup,fireEvent,render,screen,waitFor,within} from '@testing-library/react'
import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import {MemoryRouter,useLocation} from 'react-router'
import {QuestButton} from '@/features/quests/quest-button'
import type {QuestState} from '@/features/quests/api'
const mock=vi.hoisted(()=>({load:vi.fn(),claim:vi.fn(),refresh:vi.fn(),success:vi.fn()}))
vi.mock('@/components/auth-provider',()=>({useAuth:()=>({session:{user:{id:'quester'}}})}))
vi.mock('@/features/gold/gold-provider',()=>({useGold:()=>({refresh:mock.refresh}),GoldIcon:()=>null}))
vi.mock('@/features/quests/api',async original=>({...await original<typeof import('@/features/quests/api')>(),loadQuests:mock.load,claimQuest:mock.claim}))
vi.mock('sonner',()=>({toast:{success:mock.success}}))
function state(complete=false):QuestState{
 const common={start:'2026-10-19',resetsAt:new Date(Date.now()+86400000).toISOString(),bonusReady:complete,bonusClaimed:false}
 const quest={id:'fish',title:'낚시 5회',target:5,progress:complete?5:2,complete,claimed:false,reward:30,href:'/harbor',icon:'rod'}
 return {serverNow:new Date().toISOString(),daily:{...common,kind:'daily',quests:[quest],bonus:200},weekly:{...common,kind:'weekly',quests:[{...quest,id:'weekly_fish',title:'낚시 40회',target:40,reward:50}],bonus:1000}}
}
function Location(){return <output aria-label="경로">{useLocation().pathname}</output>}
function setup(){return render(<MemoryRouter><QuestButton/><Location/></MemoryRouter>)}
beforeEach(()=>{vi.clearAllMocks();mock.load.mockResolvedValue(state());mock.refresh.mockResolvedValue(undefined)})
afterEach(cleanup)
it('opens daily quests in a sheet and switches to weekly goals',async()=>{
 setup();fireEvent.click(screen.getByRole('button',{name:'퀘스트'}))
 const dialog=await screen.findByRole('dialog')
 const reward=await within(dialog).findByRole('button',{name:'낚시 5회 30골드 받기'})
 expect((reward as HTMLButtonElement).disabled).toBe(true)
 expect((screen.getByRole('button',{name:'전체 완료 200골드 받기'}) as HTMLButtonElement).disabled).toBe(true)
 fireEvent.click(screen.getByRole('tab',{name:'주간'}))
 expect(screen.getByRole('button',{name:'낚시 40회 50골드 받기'})).toBeTruthy()
 expect(screen.getByRole('button',{name:'전체 완료 1000골드 받기'})).toBeTruthy()
})
it('claims a completed reward once and refreshes the wallet',async()=>{
 mock.load.mockResolvedValue(state(true));let resolve:(s:QuestState)=>void=()=>{}
 mock.claim.mockImplementation(()=>new Promise<QuestState>(r=>{resolve=r}))
 setup();fireEvent.click(screen.getByRole('button',{name:'퀘스트'}))
 const button=await screen.findByRole('button',{name:'낚시 5회 30골드 받기'})
 fireEvent.click(button);fireEvent.click(button)
 expect(mock.claim).toHaveBeenCalledTimes(1);expect(mock.claim).toHaveBeenCalledWith('daily','2026-10-19','fish')
 const next=state(true);next.daily.quests[0].claimed=true;next.credited=30;resolve(next)
 await screen.findByRole('button',{name:'낚시 5회 보상 수령 완료'})
 await waitFor(()=>expect(mock.refresh).toHaveBeenCalledTimes(1))
 expect(mock.success).toHaveBeenCalledWith('30골드를 받았어요.')
})
it('links directly to the quest activity and closes the sheet',async()=>{
 setup();fireEvent.click(screen.getByRole('button',{name:'퀘스트'}))
 fireEvent.click(await screen.findByRole('link',{name:'낚시 5회'}))
 expect(screen.getByLabelText('경로').textContent).toBe('/harbor')
 await waitFor(()=>expect(screen.queryByRole('dialog')).toBeNull())
})
it('shows a recoverable server error without making rewards claimable',async()=>{
 mock.load.mockRejectedValue(new Error('network'));setup();fireEvent.click(screen.getByRole('button',{name:'퀘스트'}))
 expect(await screen.findByRole('alert')).toBeTruthy()
 mock.load.mockResolvedValue(state());fireEvent.click(screen.getByRole('button',{name:'퀘스트 다시 확인'}))
 expect(await screen.findByRole('button',{name:'낚시 5회 30골드 받기'})).toBeTruthy()
})

it('updates the header badge immediately after an activity while the drawer is closed',async()=>{
 setup();await waitFor(()=>expect(mock.load).toHaveBeenCalledTimes(1));
 mock.load.mockResolvedValue(state(true));
 act(()=>{window.dispatchEvent(new Event('quest-progress-changed'));window.dispatchEvent(new Event('quest-progress-changed'))});
 await screen.findByRole('button',{name:'퀘스트, 받을 보상 4개'});
 expect(mock.load).toHaveBeenCalledTimes(2);
 fireEvent.click(screen.getByRole('button',{name:'퀘스트, 받을 보상 4개'}));
 await waitFor(()=>expect((screen.getByRole('button',{name:'낚시 5회 30골드 받기'}) as HTMLButtonElement).disabled).toBe(false));
});
it('updates an open drawer after an activity without waiting for the poll',async()=>{
 setup();fireEvent.click(screen.getByRole('button',{name:'퀘스트'}));
 const reward=await screen.findByRole('button',{name:'낚시 5회 30골드 받기'});expect((reward as HTMLButtonElement).disabled).toBe(true);
 mock.load.mockResolvedValue(state(true));act(()=>{window.dispatchEvent(new Event('quest-progress-changed'))});
 await waitFor(()=>expect((screen.getByRole('button',{name:'낚시 5회 30골드 받기'}) as HTMLButtonElement).disabled).toBe(false));
});
it('shows growth rewards without a reset timer or all-complete bonus and claims with a permanent period',async()=>{
 const s=state()
 s.growth={kind:'growth',start:'2000-01-01',resetsAt:null,quests:[{id:'tanks_2',title:'어항 2개 보유하기',target:2,progress:2,complete:true,claimed:false,reward:100,href:'/aquarium',icon:'aquarium'}],bonus:0,bonusReady:false,bonusClaimed:false}
 mock.load.mockResolvedValue(s)
 const next=structuredClone(s);next.growth!.quests[0].claimed=true;next.credited=100;mock.claim.mockResolvedValue(next)
 setup();fireEvent.click(screen.getByRole('button',{name:'퀘스트'}))
 await screen.findByRole('button',{name:'낚시 5회 30골드 받기'})
 fireEvent.click(screen.getByRole('tab',{name:'성장'}))
 expect(screen.getByText('초기화 없이 한 번씩 달성')).toBeTruthy()
 expect(screen.queryByRole('button',{name:/전체 완료/})).toBeNull()
 fireEvent.click(screen.getByRole('button',{name:'어항 2개 보유하기 100골드 받기'}))
 await waitFor(()=>expect(mock.claim).toHaveBeenCalledWith('growth','2000-01-01','tanks_2'))
 expect(await screen.findByRole('button',{name:'어항 2개 보유하기 보상 수령 완료'})).toBeTruthy()
})
