import {act,cleanup,fireEvent,render,screen} from '@testing-library/react'
import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import {PresenceReporter} from '@/features/friends/presence-reporter'
import {useFriendPresence} from '@/features/friends/use-friend-presence'

const mock=vi.hoisted(()=>({owner:'me',ping:vi.fn(),load:vi.fn()}))
vi.mock('@/components/auth-provider',()=>({useAuth:()=>({session:mock.owner?{user:{id:mock.owner}}:null,recovery:false}),getNickname:()=>mock.owner?'퐁이':''}))
vi.mock('@/features/friends/presence-api',()=>({pingPlayerPresence:mock.ping,loadFriendPresence:mock.load}))
beforeEach(()=>{
 vi.useFakeTimers();mock.owner='me';mock.ping.mockResolvedValue(undefined)
 vi.spyOn(document,'visibilityState','get').mockReturnValue('visible')
 vi.spyOn(navigator,'onLine','get').mockReturnValue(true)
})
afterEach(()=>{cleanup();vi.useRealTimers();vi.restoreAllMocks();vi.resetAllMocks()})
function Reader({owner='me',friends='friend'}:{owner?:string;friends?:string}){
 const state=useFriendPresence(owner,friends)
 return <p>{state.ready?state.friends.map(f=>f.friend_id+':'+f.state).join(','):state.error?'unknown':'loading'}</p>
}
it('mounts signed-in presence on LAN HTTP without crypto.randomUUID',()=>{
 const descriptor=Object.getOwnPropertyDescriptor(globalThis.crypto,'randomUUID')
 Object.defineProperty(globalThis.crypto,'randomUUID',{configurable:true,value:undefined})
 try{
  expect(()=>render(<PresenceReporter/>)).not.toThrow()
  expect(mock.ping.mock.calls[0][0]).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4/)
 }finally{
  if(descriptor)Object.defineProperty(globalThis.crypto,'randomUUID',descriptor)
  else Reflect.deleteProperty(globalThis.crypto,'randomUUID')
 }
})
it('reports the whole app, stops hidden heartbeats and sends ordered away/close transitions',async()=>{
 const view=render(<PresenceReporter/>)
 const id=mock.ping.mock.calls[0][0]
 expect(mock.ping).toHaveBeenLastCalledWith(id,'online',1)
 await act(async()=>vi.advanceTimersByTime(30000))
 expect(mock.ping).toHaveBeenLastCalledWith(id,'online',2)
 vi.spyOn(document,'visibilityState','get').mockReturnValue('hidden')
 fireEvent(document,new Event('visibilitychange'))
 expect(mock.ping).toHaveBeenLastCalledWith(id,'away',3)
 await act(async()=>vi.advanceTimersByTime(90000))
 expect(mock.ping).toHaveBeenCalledTimes(3)
 vi.spyOn(document,'visibilityState','get').mockReturnValue('visible')
 fireEvent(document,new Event('visibilitychange'))
 expect(mock.ping).toHaveBeenLastCalledWith(id,'online',4)
 fireEvent(window,new Event('pagehide'))
 expect(mock.ping).toHaveBeenLastCalledWith(id,'offline',5)
 fireEvent(window,new Event('pageshow'))
 expect(mock.ping).toHaveBeenLastCalledWith(id,'online',6)
 view.unmount();expect(vi.getTimerCount()).toBe(0)
})
it('isolates account sessions and silently handles reporting failure',async()=>{
 mock.ping.mockRejectedValue(new Error('offline'))
 const view=render(<PresenceReporter/>),old=mock.ping.mock.calls[0][0]
 mock.owner='other';view.rerender(<PresenceReporter/>)
 expect(mock.ping.mock.calls[1]).toEqual([old,'offline',2])
 expect(mock.ping.mock.calls[2][0]).not.toBe(old)
 await act(async()=>{})
 mock.owner='';view.rerender(<PresenceReporter/>)
 expect(vi.getTimerCount()).toBe(0)
})
it('batches reads, pauses in the background and shows unknown after failure or disconnect',async()=>{
 mock.load.mockResolvedValue({serverNow:new Date().toISOString(),friends:[{friend_id:'friend',state:'online'}]})
 render(<Reader/>)
 await act(async()=>{})
 expect(screen.getByText('friend:online')).toBeTruthy()
 await act(async()=>vi.advanceTimersByTime(15000))
 expect(mock.load).toHaveBeenCalledTimes(2)
 vi.spyOn(document,'visibilityState','get').mockReturnValue('hidden')
 fireEvent(document,new Event('visibilitychange'))
 await act(async()=>vi.advanceTimersByTime(30000))
 expect(mock.load).toHaveBeenCalledTimes(2)
 expect(screen.getByText('loading')).toBeTruthy()
 mock.load.mockRejectedValueOnce(new Error('offline'))
 vi.spyOn(document,'visibilityState','get').mockReturnValue('visible')
 await act(async()=>fireEvent(document,new Event('visibilitychange')))
 expect(screen.getByText('unknown')).toBeTruthy()
 await act(async()=>fireEvent.focus(window))
 expect(screen.getByText('friend:online')).toBeTruthy()
 fireEvent(window,new Event('offline'))
 expect(screen.getByText('unknown')).toBeTruthy()
})
it('never displays a stale response after changing account or friend list',async()=>{
 let resolve:(data:unknown)=>void=()=>{}
 mock.load.mockImplementationOnce(()=>new Promise(r=>{resolve=r})).mockResolvedValue({friends:[],serverNow:new Date().toISOString()})
 const view=render(<Reader/>)
 view.rerender(<Reader owner="other" friends="new"/>)
 await act(async()=>resolve({friends:[{friend_id:'friend',state:'online'}],serverNow:new Date().toISOString()}))
 expect(screen.queryByText('friend:online')).toBeNull()
})
it('times out a hung status request and allows the next poll to recover',async()=>{
 mock.load.mockImplementationOnce((signal:AbortSignal)=>new Promise((_,reject)=>signal.addEventListener('abort',()=>reject(new Error('aborted')))))
  .mockResolvedValue({friends:[{friend_id:'friend',state:'away'}],serverNow:new Date().toISOString()})
 render(<Reader/>)
 await act(async()=>vi.advanceTimersByTime(10000))
 expect(screen.getByText('unknown')).toBeTruthy()
 await act(async()=>vi.advanceTimersByTime(5000))
 expect(screen.getByText('friend:away')).toBeTruthy()
})
