import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react'
import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import {Feeding} from '@/features/friends/feeding'
const mocks=vi.hoisted(()=>({feed:vi.fn(),success:vi.fn()}))
vi.mock('@/features/friends/aquarium-api',()=>({feedFriendAquarium:mocks.feed,visitError:()=> '연결 오류'}))
vi.mock('sonner',()=>({toast:{success:mocks.success}}))
beforeEach(()=>{const source=globalThis.crypto;vi.stubGlobal('crypto',{getRandomValues:source.getRandomValues.bind(source)});vi.clearAllMocks();mocks.feed.mockImplementation(async(_t,_o,step)=>({id:'id',clicks:step,completed:step===3,replayed:false}))})
afterEach(()=>{cleanup();vi.unstubAllGlobals()})
function surface(){return screen.getByRole('button',{name:/어항에 먹이 떨어뜨리기/})}
async function pour(step:number){fireEvent.click(surface());await waitFor(()=>expect(screen.getByRole('button',{name:`먹이 주기 ${step}/3`}).textContent).toContain(`${step}/3`));await waitFor(()=>expect(surface().getAttribute('aria-disabled')).toBe('false'))}
it('activates without a request, completes on three aquarium clicks and allows another round',async()=>{
 render(<Feeding tank="tank"/>)
 fireEvent.click(screen.getByRole('button',{name:'먹이 주기 0/3'}))
 expect(mocks.feed).not.toHaveBeenCalled()
 await pour(1);expect(mocks.success).not.toHaveBeenCalled()
 await pour(2);expect(mocks.success).not.toHaveBeenCalled()
 fireEvent.click(surface());await waitFor(()=>expect(screen.queryByRole('button',{name:/어항에 먹이 떨어뜨리기/})).toBeNull())
 expect(mocks.success).toHaveBeenCalledTimes(1)
 const calls=mocks.feed.mock.calls;expect(calls.map(c=>c[2])).toEqual([1,2,3]);expect(new Set(calls.map(c=>c[1])).size).toBe(1)
 expect(document.querySelectorAll('.aquarium-food')).toHaveLength(36)
 fireEvent.click(screen.getByRole('button',{name:'먹이 주기 3/3'}));expect(mocks.feed).toHaveBeenCalledTimes(3)
 await pour(1);expect(mocks.feed.mock.calls[3][1]).not.toBe(calls[0][1])
})
it('keeps the same operation and step after a failed request',async()=>{
 mocks.feed.mockRejectedValueOnce(new Error('offline'))
 render(<Feeding tank="tank"/>)
 fireEvent.click(screen.getByRole('button'));fireEvent.click(surface());await screen.findByRole('alert')
 expect(surface().getAttribute('aria-label')).toBe('어항에 먹이 떨어뜨리기 0/3')
 await pour(1)
 expect(mocks.feed.mock.calls[0]).toEqual(mocks.feed.mock.calls[1]);expect(mocks.success).not.toHaveBeenCalled()
})
it('drops at the clicked position and resumes after cancelling without changing progress',async()=>{
 render(<Feeding tank="tank"/>);fireEvent.click(screen.getByRole('button'))
 vi.spyOn(surface(),'getBoundingClientRect').mockReturnValue({left:100,top:50,width:400,height:600,right:500,bottom:650,x:100,y:50,toJSON:()=>({})})
 fireEvent.click(surface(),{clientX:200,clientY:200,detail:1})
 await waitFor(()=>expect(document.querySelector('.aquarium-food')).not.toBeNull())
 const pellet=document.querySelector('.aquarium-food') as HTMLElement
 expect(pellet.style.top).toBe('25%');expect(pellet.style.left).toBe('calc(25% - 10px)');expect(pellet.style.getPropertyValue('--food-fall')).toBe('466px')
 fireEvent.click(screen.getByRole('button',{name:'그만하기'}));expect(screen.queryByRole('button',{name:/어항에 먹이 떨어뜨리기/})).toBeNull()
 fireEvent.click(screen.getByRole('button',{name:'먹이 주기 1/3'}));await pour(2)
 expect(mocks.feed.mock.calls[0][1]).toBe(mocks.feed.mock.calls[1][1])
 fireEvent.keyDown(surface(),{key:'Escape'});expect(screen.queryByRole('button',{name:/어항에 먹이 떨어뜨리기/})).toBeNull()
})
it('ignores further clicks while a request is pending',async()=>{
 let resolve!:(r:object)=>void
 mocks.feed.mockImplementationOnce(()=>new Promise(r=>{resolve=r}))
 render(<Feeding tank="tank"/>);fireEvent.click(screen.getByRole('button'))
 fireEvent.click(surface());fireEvent.click(surface());expect(mocks.feed).toHaveBeenCalledTimes(1)
 resolve({id:'id',clicks:1,completed:false,replayed:false})
 await waitFor(()=>expect(surface().getAttribute('aria-disabled')).toBe('false'))
})
