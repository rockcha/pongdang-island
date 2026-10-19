import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react'
import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import {AquariumCare} from '@/features/friends/aquarium-care'
const mocks=vi.hoisted(()=>({feed:vi.fn(),clean:vi.fn(),success:vi.fn()}))
vi.mock('@/features/friends/aquarium-api',()=>({feedFriendAquarium:mocks.feed,cleanFriendAquarium:mocks.clean,visitError:()=> '연결 오류'}))
vi.mock('sonner',()=>({toast:{success:mocks.success}}))
beforeEach(()=>{const source=globalThis.crypto;vi.stubGlobal('crypto',{getRandomValues:source.getRandomValues.bind(source)});
 vi.clearAllMocks()
 localStorage.setItem('pongdang:aquarium-care-open','true')
 class TestPointerEvent extends MouseEvent{pointerId:number;pointerType:string;isPrimary:boolean;constructor(type:string,options:PointerEventInit={}){super(type,options);this.pointerId=options.pointerId??1;this.pointerType=options.pointerType??'mouse';this.isPrimary=options.isPrimary??true}}
 vi.stubGlobal('PointerEvent',TestPointerEvent)
 mocks.clean.mockImplementation(async(_t,_o,step)=>({id:'clean',clicks:step,completed:step===3,replayed:false}))
})
afterEach(()=>{cleanup();localStorage.removeItem('pongdang:aquarium-care-open');vi.unstubAllGlobals()})
function surface(){return screen.getByRole('button',{name:/어항 문지르기/})}
function scrub(distance=80,type='mouse'){
 const area=surface();vi.spyOn(area,'getBoundingClientRect').mockReturnValue({left:0,top:0,width:400,height:600,right:400,bottom:600,x:0,y:0,toJSON:()=>({})})
 fireEvent.pointerDown(area,{clientX:80,clientY:100,button:0,pointerId:1,pointerType:type})
 fireEvent.pointerMove(area,{clientX:80+distance,clientY:100,pointerId:1,pointerType:type})
 fireEvent.pointerUp(area,{clientX:80+distance,clientY:100,pointerId:1,pointerType:type})
}
it('counts three separate rubs, not taps, and keeps feeding mutually exclusive',async()=>{
 render(<AquariumCare tank="tank"/>);fireEvent.click(screen.getByRole('button',{name:'청소하기 0/3'}))
 expect(screen.queryByRole('button',{name:/먹이 주기 \d/})).toBeNull();expect(mocks.clean).not.toHaveBeenCalled()
 scrub(8);expect(mocks.clean).not.toHaveBeenCalled()
 for(let i=1;i<=3;i++){
  scrub(80,i===2?'touch':'mouse')
  await waitFor(()=>expect(screen.getByRole('button',{name:`청소하기 ${i}/3`}).textContent).toContain(`${i}/3`))
  if(i<3){await waitFor(()=>expect(surface().getAttribute('aria-disabled')).toBe('false'));expect(mocks.success).not.toHaveBeenCalled()}
 }
 expect(mocks.clean.mock.calls.map(c=>c[2])).toEqual([1,2,3]);expect(new Set(mocks.clean.mock.calls.map(c=>c[1])).size).toBe(1)
 expect(mocks.success).toHaveBeenCalledOnce();expect(mocks.feed).not.toHaveBeenCalled()
 expect(document.querySelectorAll('.aquarium-soap-bubble').length).toBeGreaterThan(0)
 expect(screen.getByRole('button',{name:'먹이 주기 0/3'})).toBeTruthy()
 fireEvent.click(screen.getByRole('button',{name:'청소하기 3/3'}));scrub()
 await waitFor(()=>expect(surface().getAttribute('aria-label')).toContain('1/3'))
 expect(mocks.clean.mock.calls[3][1]).not.toBe(mocks.clean.mock.calls[0][1])
})
it('does not count a cancelled gesture or count repeated moves as several strokes',async()=>{
 render(<AquariumCare tank="tank"/>);fireEvent.click(screen.getByRole('button',{name:'청소하기 0/3'}))
 fireEvent.pointerDown(surface(),{pointerId:1,button:0});fireEvent.pointerCancel(surface(),{pointerId:1});fireEvent.pointerUp(surface(),{pointerId:1});expect(mocks.clean).not.toHaveBeenCalled()
 scrub();await waitFor(()=>expect(surface().getAttribute('aria-disabled')).toBe('false'))
 expect(mocks.clean).toHaveBeenCalledOnce()
 fireEvent.keyDown(surface(),{key:'Escape'});expect(screen.queryByRole('button',{name:/어항 문지르기/})).toBeNull()
 fireEvent.click(screen.getByRole('button',{name:'먹이 주기 0/3'}));expect(screen.queryByRole('button',{name:/청소하기 \d/})).toBeNull()
})
it('preserves operation on error and supports keyboard cleaning',async()=>{
 mocks.clean.mockRejectedValueOnce(new Error('offline'))
 render(<AquariumCare tank="tank"/>);fireEvent.click(screen.getByRole('button',{name:'청소하기 0/3'}))
 scrub();await screen.findByRole('alert');expect(surface().getAttribute('aria-label')).toContain('0/3')
 fireEvent.click(surface(),{detail:0});await waitFor(()=>expect(surface().getAttribute('aria-label')).toContain('1/3'))
 expect(mocks.clean.mock.calls[0]).toEqual(mocks.clean.mock.calls[1])
})
