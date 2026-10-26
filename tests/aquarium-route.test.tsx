import {cleanup,render,screen,fireEvent,waitFor} from '@testing-library/react'
import {MemoryRouter,Routes,Route,useLocation,useNavigate} from 'react-router'
import {afterEach,expect,it,vi} from 'vitest'
import {AquariumPage} from '@/pages/aquarium-page'
vi.mock('@/lib/account-query',()=>({useAccountState:()=>[{tanks:[{id:'one',name:'첫 어항'},{id:'two',name:'둘째 어항'}],catalog:[],inhabitants:[]},vi.fn(),{error:null}]}))
vi.mock('@/features/notices/use-operator',()=>({useOperator:()=>({operator:false})}))
vi.mock('@/features/gold/gold-provider',()=>({useGold:()=>({wallet:{gold:500},transact:vi.fn()}),GoldIcon:()=>null}))
vi.mock('@/features/aquarium/aquarium-view',()=>({AquariumView:(p:any)=><>{p.overviewContent??<p data-testid="tank">{p.tankId}</p>}{p.onOverview&&<button>내 어항 목록</button>}</>}))
vi.mock('@/features/aquarium/aquarium-overview',()=>({AquariumOverview:(p:any)=><button onClick={()=>p.onSelect('two')}>둘째 어항 열기</button>}))
afterEach(cleanup)
function Location(){const l=useLocation(),n=useNavigate();return <><output data-testid="path">{l.pathname}</output><button onClick={()=>n(-1)}>브라우저 뒤로</button></>}
function view(path:string){render(<MemoryRouter initialEntries={[path]}><Location/><Routes><Route path="/aquarium/:tankId?" element={<AquariumPage/>}/></Routes></MemoryRouter>)}
it('opens a tank URL and returns to the overview through browser history',async()=>{
 view('/aquarium');fireEvent.click(screen.getByText('둘째 어항 열기'))
 expect(screen.getByTestId('path').textContent).toBe('/aquarium/two')
 expect(screen.getByTestId('tank').textContent).toBe('two')
 expect(screen.queryByRole('button',{name:'내 어항 목록'})).toBeNull()
 fireEvent.click(screen.getByText('브라우저 뒤로'))
 expect(screen.getByText('둘째 어항 열기')).toBeTruthy()
})
it('opens the requested tank on direct entry',()=>{view('/aquarium/two');expect(screen.getByTestId('tank').textContent).toBe('two')})
it('replaces an unavailable tank URL with the overview',async()=>{view('/aquarium/missing');await waitFor(()=>expect(screen.getByTestId('path').textContent).toBe('/aquarium'));expect(screen.getByText('둘째 어항 열기')).toBeTruthy()})
