import {act,cleanup,render,screen,waitFor} from '@testing-library/react'
import {MemoryRouter} from 'react-router'
import {afterEach,expect,it,vi} from 'vitest'
import {appQueryClient,setQueryAccount} from '@/lib/account-cache'
import {FarmWithFriends} from '@/features/farm/farm-friends'

const fixture=vi.hoisted(()=>({read:vi.fn(),farmReady:Promise.resolve()}))
vi.mock('@/components/auth-provider',()=>({useAuth:()=>({session:{user:{id:'viewer'}}})}))
vi.mock('@/features/farm/visits-api',async original=>({...await original<typeof import('@/features/farm/visits-api')>(),readFarmFriends:fixture.read}))
vi.mock('@/features/farm/account-farm',async()=>{
 const {useEffect,useState}=await import('react')
 return {AccountFarm:({headerExtra}:{headerExtra:(busy:boolean)=>React.ReactNode})=>{
  const [ready,setReady]=useState(false)
  useEffect(()=>{let mounted=true;void fixture.farmReady.then(()=>{if(mounted)setReady(true)});return()=>{mounted=false}},[])
  return ready?<header>{headerExtra(false)}</header>:<p>농장 로딩</p>
 }}
})
afterEach(()=>{cleanup();setQueryAccount(null);appQueryClient.clear();vi.clearAllMocks()})
it('shows avatars without a click when the directory completes before the farm header mounts',async()=>{
 let showFarm!:()=>void,resolveDirectory!:(value:unknown)=>void
 fixture.farmReady=new Promise(resolve=>{showFarm=resolve})
 fixture.read.mockReturnValue(new Promise(resolve=>{resolveDirectory=resolve}))
 setQueryAccount('viewer')
 render(<MemoryRouter><FarmWithFriends/></MemoryRouter>)
 await waitFor(()=>expect(fixture.read).toHaveBeenCalledTimes(1))
 await act(async()=>{resolveDirectory({self:{id:'viewer',nickname:'나',avatar_path:null},likeCount:0,friends:[{id:'friend',nickname:'친구',avatar_path:null}]})})
 expect(screen.getByText('농장 로딩')).toBeTruthy()
 await act(async()=>showFarm())
 expect(await screen.findByRole('button',{name:'친구 농장 방문'})).toBeTruthy()
 expect(screen.queryByText('친구를 불러오는 중…')).toBeNull()
})
