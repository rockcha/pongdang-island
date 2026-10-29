import {act,cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react'
import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import {MemoryRouter,useLocation} from 'react-router'
import {ForegroundPush} from '@/features/notifications/foreground-push'
import {foregroundNoticeEvent} from '@/features/notifications/foreground-notice'
import {appQueryClient,setQueryAccount} from '@/lib/account-cache'
const mock=vi.hoisted(()=>({owner:'owner',read:vi.fn(),listener:null as null|((event:MessageEvent)=>void),post:vi.fn()}))
vi.mock('@/components/auth-provider',()=>({useAuth:()=>({session:{user:{id:mock.owner}},recovery:false})}))
vi.mock('@/features/notifications/push-notice-api',()=>({readActivePush:mock.read}))
const payload=(id:string,userId='owner')=>({userId,category:'production',title:'完了',body:'연료 10개가 준비됐어요.',quantity:10,url:'/production',tag:'notice:'+id})
function View(){return <><ForegroundPush/><output>{useLocation().pathname}</output></>}
beforeEach(()=>{
 vi.spyOn(document,'hasFocus').mockReturnValue(true)
 appQueryClient.clear();setQueryAccount('owner');mock.owner='owner';mock.read.mockResolvedValue({active:[],observedBefore:Date.now()-1000})
 vi.stubGlobal('navigator',{serviceWorker:{addEventListener:(type:string,fn:(e:MessageEvent)=>void)=>{mock.listener=fn},removeEventListener:vi.fn(),getRegistration:async()=>({active:{postMessage:mock.post}})}})
})
afterEach(()=>{cleanup();vi.unstubAllGlobals();vi.restoreAllMocks();vi.clearAllMocks();appQueryClient.clear();setQueryAccount(null)})
it('groups fresh realtime notifications and navigates from the Pongi card',async()=>{
 render(<MemoryRouter><View/></MemoryRouter>)
 act(()=>{for(const id of ['1','2'])window.dispatchEvent(new CustomEvent(foregroundNoticeEvent,{detail:payload(id)}))})
 expect(await screen.findByText('🔥 따끈한 연료가 준비됐어요')).toBeTruthy()
 expect(screen.getByText(/생산소 2곳 · 연료 20개/)).toBeTruthy()
 fireEvent.click(screen.getByRole('button',{name:'받으러 가기'}))
 expect(screen.getByText('/production')).toBeTruthy()
})
it('rejects another account and acknowledges a visible card only after displaying it',async()=>{
 render(<MemoryRouter><View/></MemoryRouter>)
 const postMessage=vi.fn(),port={postMessage,close:vi.fn()}
 act(()=>mock.listener?.({data:{type:'PONGDANG_PUSH',payload:payload('bad','other')},ports:[port],origin:location.origin} as unknown as MessageEvent))
 expect(postMessage).toHaveBeenCalledWith({shown:false})
 postMessage.mockClear()
 act(()=>mock.listener?.({data:{type:'PONGDANG_PUSH',payload:payload('1')},ports:[port],origin:location.origin} as unknown as MessageEvent))
 expect(postMessage).not.toHaveBeenCalled()
 await screen.findByText('🔥 따끈한 연료가 준비됐어요')
 expect(postMessage).toHaveBeenCalledWith({shown:true})
})
it('clears a claimed card after a new authoritative snapshot and not from an older read',async()=>{
 render(<MemoryRouter><View/></MemoryRouter>)
 act(()=>window.dispatchEvent(new CustomEvent(foregroundNoticeEvent,{detail:payload('1')})))
 await screen.findByText('🔥 따끈한 연료가 준비됐어요')
 mock.read.mockResolvedValue({active:[],observedBefore:Date.now()+1})
 await act(async()=>{await appQueryClient.refetchQueries()})
 await waitFor(()=>expect(screen.queryByText('🔥 따끈한 연료가 준비됐어요')).toBeNull())
 expect(mock.post).toHaveBeenCalledWith(expect.objectContaining({type:'PUSHDATA_RECONCILE',userId:'owner'}))
})
