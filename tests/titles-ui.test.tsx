import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react'
import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import {MemoryRouter} from 'react-router'
import {TitlePicker} from '@/features/titles/title-picker'
const mock=vi.hoisted(()=>({load:vi.fn(),equip:vi.fn(),refresh:vi.fn()}))
vi.mock('@/features/social/social-provider',()=>({useSocial:()=>({profile:{equipped_title:null},refresh:mock.refresh})}))
vi.mock('@/features/titles/api',()=>({loadTitles:mock.load,equipTitle:mock.equip}))
const title={id:'fishing-1',name:'첫 물결의 낚시꾼',tier:1,category:'growth',description:'직접 낚시 누적 30회',target:30,progress:30,extra_target:null,extraProgress:null,earnedAt:'2026-10-19T00:00:00Z'}
const base={equipped:null,titles:[title,{...title,id:'fishing-2',name:'물때를 읽는 사람',tier:2,target:200,description:'직접 낚시 누적 200회',earnedAt:null}]}
beforeEach(()=>{vi.clearAllMocks();mock.load.mockResolvedValue(base);mock.refresh.mockResolvedValue(undefined)})
afterEach(cleanup)
it('loads the standalone titles page directly without a dialog',async()=>{
 render(<MemoryRouter initialEntries={['/titles']}><TitlePicker page/></MemoryRouter>)
 expect(screen.getByText('현재 칭호')).toBeTruthy()
 await screen.findByRole('button',{name:'첫 물결의 낚시꾼 장착'})
 expect(screen.queryByRole('dialog')).toBeNull()
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
