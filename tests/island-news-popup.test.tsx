import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react'
import {MemoryRouter,Link} from 'react-router'
import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import {IslandNewsPopup,islandNewsDay} from '@/components/island-news-popup'
const auth=vi.hoisted(()=>({user:'islander'}))
vi.mock('@/components/auth-provider',()=>({getNickname:()=> '섬주민',useAuth:()=>({session:auth.user?{user:{id:auth.user}}:null,loading:false,recovery:false})}))
vi.mock('@/pages/home-page',()=>({HomePage:()=> <div><p>새로운 해역 · 신규 어종 · 이벤트</p><Link to="/island-news">소식 페이지 열기</Link></div>}))
function show(path='/aquarium'){return render(<MemoryRouter initialEntries={[path]}><IslandNewsPopup/><Link to="/aquarium">아쿠아리움</Link><Link to="/island-news">메뉴에서 소식 보기</Link></MemoryRouter>)}
beforeEach(()=>{auth.user='islander';localStorage.clear();vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(new Date('2026-10-23T03:00:00Z'))})
afterEach(()=>{cleanup();vi.useRealTimers();localStorage.clear()})
it('opens over the aquarium once per app visit without hiding the manual news page',async()=>{
 show();expect(await screen.findByRole('dialog',{name:'퐁당섬 소식'})).toBeTruthy()
 fireEvent.click(screen.getByRole('button',{name:'닫기'}))
 await waitFor(()=>expect(screen.queryByRole('dialog')).toBeNull())
 fireEvent.click(screen.getByRole('link',{name:'메뉴에서 소식 보기'}))
 fireEvent.click(screen.getByRole('link',{name:'아쿠아리움'}))
 expect(screen.queryByRole('dialog')).toBeNull()
})
it('honors today suppression by account and resets at Korean midnight',async()=>{
 let view=show();await screen.findByRole('dialog')
 fireEvent.click(screen.getByRole('checkbox',{name:'오늘 하루 안 보기'}))
 fireEvent.click(screen.getByRole('button',{name:'닫기'}))
 await waitFor(()=>expect(screen.queryByRole('dialog')).toBeNull());view.unmount()
 view=show();expect(screen.queryByRole('dialog')).toBeNull();view.unmount()
 auth.user='another-islander';view=show();expect(await screen.findByRole('dialog')).toBeTruthy();view.unmount()
 auth.user='islander';vi.setSystemTime(new Date('2026-10-23T15:00:01Z'));show()
 expect(await screen.findByRole('dialog')).toBeTruthy()
 expect(islandNewsDay(new Date('2026-10-23T14:59:59Z'))).not.toBe(islandNewsDay(new Date('2026-10-23T15:00:00Z')))
})
it('does not interrupt deep links and closes when a news link is followed',async()=>{
 const view=show('/island-news');expect(screen.queryByRole('dialog')).toBeNull();view.unmount()
 show();await screen.findByRole('dialog')
 fireEvent.click(screen.getByRole('link',{name:'소식 페이지 열기'}))
 await waitFor(()=>expect(screen.queryByRole('dialog')).toBeNull())
})
it('keeps dismissal usable if local storage is unavailable',async()=>{
 vi.spyOn(Storage.prototype,'setItem').mockImplementation(()=>{throw Error('blocked')})
 show();await screen.findByRole('dialog')
 fireEvent.click(screen.getByRole('checkbox',{name:'오늘 하루 안 보기'}));fireEvent.click(screen.getByRole('button',{name:'닫기'}))
 await waitFor(()=>expect(screen.queryByRole('dialog')).toBeNull())
 vi.restoreAllMocks()
})
it('stays open on backdrop presses and Escape until a close button is used',async()=>{
 show();await screen.findByRole('dialog')
 const backdrop=document.querySelector('[data-slot="dialog-overlay"]')!
 fireEvent.pointerDown(backdrop,{button:0});fireEvent.pointerUp(backdrop,{button:0});fireEvent.click(backdrop)
 fireEvent.keyDown(screen.getByRole('dialog'),{key:'Escape',code:'Escape'})
 expect(screen.getByRole('dialog',{name:'퐁당섬 소식'})).toBeTruthy()
 fireEvent.click(screen.getByRole('button',{name:'소식 닫기'}))
 await waitFor(()=>expect(screen.queryByRole('dialog')).toBeNull())
})
