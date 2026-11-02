import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react'
import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import {MemoryRouter} from 'react-router'
import {TitlePicker} from '@/features/titles/title-picker'
import {appQueryClient,publishAccountResource,setQueryAccount,getQueryAccount} from '@/lib/account-cache'
import {writeFileSync} from 'node:fs'
const mock=vi.hoisted(()=>({load:vi.fn(),equip:vi.fn(),refresh:vi.fn()}))
vi.mock('@/features/social/social-provider',()=>({useSocial:()=>({profile:{equipped_title:null},refresh:mock.refresh})}))
vi.mock('@/components/auth-provider',()=>({useAuth:()=>({session:{user:{id:'title-user'}},recovery:false})}))
vi.mock('@/features/titles/api',()=>({readTitles:mock.load,equipTitle:async(id:string|null)=>{const state=await mock.equip(id);publishAccountResource('titles',state,getQueryAccount());return state}}))
const title={id:'fishing-1',name:'첫 물결의 낚시꾼',tier:1,category:'growth',description:'직접 낚시 누적 30회',target:30,progress:30,extra_target:null,extraProgress:null,earnedAt:'2026-10-19T00:00:00Z'}
const base={equipped:null,titles:[title,{...title,id:'fishing-2',name:'물때를 읽는 사람',tier:2,target:200,description:'직접 낚시 누적 200회',earnedAt:null}]}
beforeEach(()=>{vi.clearAllMocks();setQueryAccount('title-user');mock.load.mockResolvedValue(base);mock.refresh.mockResolvedValue(undefined)})
afterEach(()=>{cleanup();setQueryAccount(null);appQueryClient.clear()})
it('filters minigame titles without revealing unearned conditions',async()=>{
 mock.load.mockResolvedValue({...base,titles:[...base.titles,{...title,id:'arcade-ladder-4',name:'사다리의 왕',tier:4,category:'arcade',description:null,target:null,progress:null,earnedAt:null}]})
 render(<MemoryRouter><TitlePicker page/></MemoryRouter>)
 await screen.findByText('사다리의 왕')
 fireEvent.click(screen.getByRole('button',{name:'미니게임'}))
 expect(screen.getByText('사다리의 왕')).toBeTruthy()
 expect(screen.queryByText('첫 물결의 낚시꾼')).toBeNull()
 expect(screen.getByText('획득하면 조건이 공개돼요.')).toBeTruthy()
 expect((screen.getByRole('button',{name:'사다리의 왕 장착'}) as HTMLButtonElement).disabled).toBe(true)
})
it('loads the standalone titles page directly without a dialog',async()=>{
 render(<MemoryRouter initialEntries={['/titles']}><TitlePicker page/></MemoryRouter>)
 expect(screen.getByText('현재 칭호')).toBeTruthy()
 await screen.findByRole('button',{name:'첫 물결의 낚시꾼 장착'})
 expect(screen.queryByRole('dialog')).toBeNull()
 expect(screen.getByLabelText('칭호 등급 색상 안내')).toBeTruthy()
 expect(screen.getByRole('img',{name:'희귀 등급'})).toBeTruthy()
 expect(screen.getByRole('heading',{name:/물때를 읽는 사람.*희귀 등급/}).className).toContain('text-blue-600')
})
it('shows earned and unearned titles and only equips earned titles',async()=>{
 mock.equip.mockResolvedValue({...base,equipped:'fishing-1'})
 render(<MemoryRouter><TitlePicker/></MemoryRouter>);fireEvent.click(screen.getByRole('button',{name:'칭호 변경'}))
 const available=await screen.findByRole('button',{name:'첫 물결의 낚시꾼 장착'})
 expect(screen.getByText('직접 낚시 누적 30회')).toBeTruthy()
 expect(screen.queryByText('직접 낚시 누적 200회')).toBeNull()
 expect(screen.getByText('획득하면 조건이 공개돼요.')).toBeTruthy()
 expect(screen.queryByText('30 / 200')).toBeNull()
 expect((screen.getByRole('button',{name:'물때를 읽는 사람 장착'}) as HTMLButtonElement).disabled).toBe(true)
 fireEvent.click(available);await screen.findByRole('button',{name:'첫 물결의 낚시꾼 장착 중'})
 expect(mock.equip).toHaveBeenCalledWith('fishing-1');await waitFor(()=>expect(mock.refresh).toHaveBeenCalledTimes(1))
 fireEvent.click(screen.getByRole('button',{name:'칭호 해제'}));await waitFor(()=>expect(mock.equip).toHaveBeenCalledWith(null))
})
it('opens from achievement notifications and filters by ownership without tier controls',async()=>{
 render(<MemoryRouter initialEntries={['/profile?titles=1']}><TitlePicker/></MemoryRouter>)
 await screen.findByRole('button',{name:'첫 물결의 낚시꾼 장착'})
 expect(screen.queryByLabelText('칭호 단계')).toBeNull()
 expect(screen.queryByText('초급')).toBeNull()
 expect(screen.queryByText('중급')).toBeNull()
 expect(screen.getByText('장착한 칭호 없음')).toBeTruthy()
 fireEvent.click(screen.getByLabelText('획득한 칭호만'))
 expect(screen.getByText('첫 물결의 낚시꾼')).toBeTruthy()
 expect(screen.queryByText('물때를 읽는 사람')).toBeNull()
})
it('retains the previous selection on an uncertain save and offers retry',async()=>{
 mock.equip.mockRejectedValue(new Error('offline'))
 render(<MemoryRouter><TitlePicker/></MemoryRouter>);fireEvent.click(screen.getByRole('button',{name:'칭호 변경'}))
 fireEvent.click(await screen.findByRole('button',{name:'첫 물결의 낚시꾼 장착'}))
 expect(await screen.findByRole('alert')).toBeTruthy();expect(mock.refresh).not.toHaveBeenCalled()
})
it('searches names and Korean initials locally and combines grade, category and ownership filters',async()=>{
 const mythic={...title,id:'activity-bait-6',name:'끝없는 바다의 양식',tier:4,category:'growth',description:null,target:null,progress:null,earnedAt:null}
 mock.load.mockResolvedValue({...base,titles:[...base.titles,mythic]})
 render(<MemoryRouter><TitlePicker page/></MemoryRouter>);await screen.findByText(mythic.name)
 if(process.env.TITLE_SEARCH_QA)writeFileSync('artifacts/title-search.fragment.html',document.querySelector('section')!.outerHTML)
 fireEvent.change(screen.getByRole('searchbox',{name:'칭호 검색'}),{target:{value:'ㄲㅇㄴ'}})
 expect(screen.getByText(mythic.name)).toBeTruthy();expect(screen.queryByText(title.name)).toBeNull()
 fireEvent.click(screen.getByRole('button',{name:'칭호 검색 지우기'}))
 fireEvent.change(screen.getByLabelText('칭호 등급'),{target:{value:'4'}})
 expect(screen.getByText(mythic.name)).toBeTruthy();expect(screen.queryByText(title.name)).toBeNull()
 fireEvent.change(screen.getByRole('searchbox'),{target:{value:'끝없는 양식'}});expect(screen.getByText(mythic.name)).toBeTruthy()
 fireEvent.click(screen.getByLabelText('획득한 칭호만'));expect(screen.getByText('조건에 맞는 칭호가 없어요.')).toBeTruthy()
 expect(mock.load).toHaveBeenCalledTimes(1)
})
