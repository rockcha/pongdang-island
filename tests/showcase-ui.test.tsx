import {act,cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react'
import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import {createMemoryRouter,RouterProvider} from 'react-router'
import {CatchReveal} from '@/features/fishing/catch-reveal'
import {practiceSpecies} from '@/features/fishing/fishing-practice'
import {ShowcaseEditor} from '@/features/showcase/showcase-editor'
import {ShowcasePage} from '@/features/showcase/showcase-page'
import {ShowcaseCard} from '@/features/showcase/showcase-card'
import {ShowcasePreview} from '@/features/showcase/showcase-preview'
import {startShowcaseDraft,getShowcaseDraft} from '@/features/showcase/draft'
const owner='00000000-0000-0000-0000-000000007201'
const mock=vi.hoisted(()=>({paint:vi.fn(),publish:vi.fn(),feed:vi.fn(),react:vi.fn(),people:vi.fn()}))
vi.mock('@/features/showcase/moment-art',()=>({paintCatchMoment:mock.paint}))
vi.mock('@/features/showcase/api',async original=>({...await original<typeof import('@/features/showcase/api')>(),publishShowcase:mock.publish,loadShowcase:mock.feed,reactToShowcase:mock.react,loadShowcaseReactionPeople:mock.people}))
vi.mock('@/components/auth-provider',()=>({useAuth:()=>({session:{user:{id:'00000000-0000-0000-0000-000000007201'}}}),getNickname:()=> '퐁당낚시꾼'}))
vi.mock('@/features/notices/use-operator',()=>({useOperator:()=>({operator:false,loading:false})}))
vi.mock('@/features/collection/api',()=>({collectibleUrl:(path:string)=>'/collectibles/'+path}))
vi.mock('sonner',()=>({toast:{success:vi.fn(),error:vi.fn()}}))
beforeEach(()=>{
 mock.paint.mockResolvedValue(undefined);mock.publish.mockResolvedValue('published');mock.feed.mockResolvedValue({items:[],total:0})
})
afterEach(()=>{cleanup();vi.clearAllMocks();vi.useRealTimers();vi.unstubAllGlobals()})
function draft(preview=false){return startShowcaseDraft({owner,operationId:'real-operation',species:practiceSpecies('mythic'),firstDiscovery:true,renderVersion:1,caughtAt:'2026-10-21T12:00:00Z',regionName:'퐁당섬 앞바다',preview})}
function editor(id?:string,feed=false){
 const router=createMemoryRouter([{path:'/showcase/new',element:<ShowcaseEditor/>},{path:'/showcase',element:feed?<ShowcasePage/>:<p>자랑 목록</p>}],{initialEntries:[{pathname:'/showcase/new',state:id?{showcaseDraft:id}:null}]})
 render(<RouterProvider router={router}/>);return router
}
it('offers sharing only for real epic/mythic reveals after the animation without creating an image file',async()=>{
 vi.useFakeTimers()
 const onShare=vi.fn(),onDismiss=vi.fn(),view=render(<CatchReveal species={practiceSpecies('mythic')} onShare={onShare} onDismiss={onDismiss}/> )
 expect(screen.getByRole('button',{name:'자랑하기'})).toHaveProperty('disabled',true)
 expect(document.querySelector('canvas')).toBeNull()
 expect(mock.paint).not.toHaveBeenCalled()
 expect(document.querySelector('.catch-grade-rays')).toBeTruthy()
 expect(document.querySelector('.catch-reveal-spark')).toBeTruthy()
 await act(async()=>{vi.advanceTimersByTime(1300)})
 fireEvent.click(screen.getByRole('button',{name:'자랑하기'}))
 await act(async()=>{})
 expect(onShare).toHaveBeenCalledWith()
 expect(onShare).toHaveBeenCalledOnce();expect(onDismiss).not.toHaveBeenCalled()
 for(const rarity of ['common','rare'] as const){view.rerender(<CatchReveal species={practiceSpecies(rarity)} onShare={onShare} onDismiss={onDismiss}/>);expect(screen.queryByRole('button',{name:'자랑하기'})).toBeNull()}
 view.rerender(<CatchReveal species={practiceSpecies('epic')} practice onShare={onShare} onDismiss={onDismiss}/>)
 expect(screen.queryByRole('button',{name:'자랑하기'})).toBeNull()
})
it('stores only moment metadata in drafts and can open writing without image serialization',async()=>{
 const id=draft(),value=getShowcaseDraft(owner,id)!
 expect(value).not.toHaveProperty('image');expect(value).not.toHaveProperty('imagePath')
 expect(value.firstDiscovery).toBe(true);expect(value.renderVersion).toBe(1)
 editor(id)
 expect(screen.getByRole('textbox')).toBeTruthy()
 await waitFor(()=>expect(screen.getByRole('button',{name:'자랑 올리기'})).toHaveProperty('disabled',false))
})
it('rejects direct entry and drafts belonging to another player',async()=>{
 const id=draft();expect(getShowcaseDraft('other',id)).toBeNull()
 const router=editor();await screen.findByText('자랑 목록');expect(router.state.location.pathname).toBe('/showcase')
})
it('waits for a visible catch image before allowing publication',async()=>{
 let finish!:()=>void;mock.paint.mockReturnValue(new Promise<void>(resolve=>{finish=resolve}))
 editor(draft())
 const publish=screen.getByRole('button',{name:'자랑 올리기'})
 expect(publish).toHaveProperty('disabled',true);fireEvent.click(publish);expect(mock.publish).not.toHaveBeenCalled()
 finish();await waitFor(()=>expect(publish).toHaveProperty('disabled',false))
})
it('locks the preview route for non-operators even in development',async()=>{
 const router=createMemoryRouter([{path:'/showcase/preview',element:<ShowcasePreview/>},{path:'/showcase',element:<p>자랑 목록</p>}],{initialEntries:['/showcase/preview']})
 render(<RouterProvider router={router}/>)
 await screen.findByText('자랑 목록')
 expect(screen.queryByRole('button',{name:'포획 화면 테스트'})).toBeNull()
})
it('preserves caption and verified attempt reference on ambiguous publication failure',async()=>{
 mock.publish.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce('published')
 const router=editor(draft())
 await waitFor(()=>expect(screen.getByRole('button',{name:'자랑 올리기'})).toHaveProperty('disabled',false))
 const caption=screen.getByRole('textbox',{name:'이 순간, 어땠나요?'})
 expect(caption.getAttribute('maxlength')).toBe('200')
 fireEvent.change(caption,{target:{value:'드디어 만났다!'}})
 fireEvent.click(screen.getByRole('button',{name:'자랑 올리기'}))
 await screen.findByRole('alert')
 expect((caption as HTMLTextAreaElement).value).toBe('드디어 만났다!')
 fireEvent.click(screen.getByRole('button',{name:'자랑 올리기'}))
 await screen.findByText('자랑 목록')
 expect(mock.publish).toHaveBeenCalledTimes(2)
 expect(mock.publish).toHaveBeenLastCalledWith('real-operation','드디어 만났다!')
 expect(router.state.location.pathname).toBe('/showcase')
})
it('keeps preview publication and emoji reactions entirely local',async()=>{
 editor(draft(true),true)
 await waitFor(()=>expect(screen.getByRole('button',{name:'미리보기로 확인'})).toHaveProperty('disabled',false))
 fireEvent.change(screen.getByRole('textbox'),{target:{value:'미리보기 캡션'}})
 fireEvent.click(screen.getByRole('button',{name:'미리보기로 확인'}))
 await screen.findByText('미리보기 캡션')
 fireEvent.click(screen.getByRole('button',{name:'축하해요'}))
 await waitFor(()=>expect(screen.getByRole('button',{name:'축하해요'}).getAttribute('aria-pressed')).toBe('true'))
 fireEvent.click(screen.getByRole('button',{name:'멋져요'}))
 expect(screen.getByRole('button',{name:'축하해요'}).getAttribute('aria-pressed')).toBe('false')
 fireEvent.click(screen.getByRole('button',{name:'멋져요'}))
 expect(screen.getByRole('button',{name:'멋져요'}).getAttribute('aria-pressed')).toBe('false')
 expect(mock.publish).not.toHaveBeenCalled();expect(mock.react).not.toHaveBeenCalled();expect(mock.feed).not.toHaveBeenCalled()
})
it('sends explicit emoji cancellation rather than toggling blindly on retries',()=>{
 const onReact=vi.fn()
 render(<ShowcaseCard post={{id:'post',author_id:owner,author_name:'낚시꾼',avatar_path:null,operation_id:'op',first_discovery:true,render_version:1,caption:'자랑',species:practiceSpecies('mythic'),rarity:'mythic',region_name:'퐁당섬',caught_at:new Date().toISOString(),created_at:new Date().toISOString(),my_reaction:'celebrate',reactions:{celebrate:1}}} onReact={onReact}/> )
 fireEvent.click(screen.getByRole('button',{name:'축하해요'}));expect(onReact).toHaveBeenLastCalledWith(null)
 fireEvent.click(screen.getByRole('button',{name:'행운 나눠요'}));expect(onReact).toHaveBeenLastCalledWith('luck')
 fireEvent.click(screen.getByRole('button',{name:'슬퍼요'}));expect(onReact).toHaveBeenLastCalledWith('sad')
 fireEvent.click(screen.getByRole('button',{name:'화나요'}));expect(onReact).toHaveBeenLastCalledWith('angry')
})
it('opens reaction identities from the count without changing a reaction, filters and visits aquariums',async()=>{
 const onReact=vi.fn(),post={id:'post',author_id:owner,author_name:'낚시꾼',avatar_path:null,operation_id:'op',first_discovery:true,render_version:1 as const,caption:'자랑',species:practiceSpecies('mythic'),rarity:'mythic' as const,region_name:'퐁당섬',caught_at:new Date().toISOString(),created_at:new Date().toISOString(),my_reaction:'celebrate' as const,reactions:{celebrate:1,love:1}}
 mock.people.mockResolvedValueOnce({counts:post.reactions,total:1,items:[{user_id:'visitor',nickname:'바다친구',avatar_path:null,reaction:'celebrate'}]}).mockResolvedValueOnce({counts:post.reactions,total:2,items:[{user_id:'visitor',nickname:'바다친구',avatar_path:null,reaction:'celebrate'}]})
 const router=createMemoryRouter([{path:'/',element:<ShowcaseCard post={post} onReact={onReact}/>},{path:'/friends/:ownerId/aquarium',element:<p>친구 수족관</p>}])
 render(<RouterProvider router={router}/>)
 fireEvent.click(screen.getByRole('button',{name:'축하해요 1명 보기'}))
 await screen.findByText('바다친구')
 expect(onReact).not.toHaveBeenCalled();expect(mock.people).toHaveBeenLastCalledWith('post','celebrate',0)
 fireEvent.click(screen.getByRole('button',{name:'전체 반응 보기'}))
 await waitFor(()=>expect(mock.people).toHaveBeenLastCalledWith('post',null,0))
 fireEvent.click(await screen.findByRole('link',{name:/바다친구/}))
 await screen.findByText('친구 수족관')
 expect(router.state.location.pathname).toBe('/friends/visitor/aquarium')
})
it('retries reaction list failures without changing the selected reaction',async()=>{
 mock.people.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({counts:{},total:0,items:[]})
 const {ShowcaseReactionPeopleDialog}=await import('@/features/showcase/showcase-reaction-people')
 const post={id:'post',author_id:owner,author_name:'낚시꾼',avatar_path:null,operation_id:'op',first_discovery:true,render_version:1 as const,caption:'자랑',species:practiceSpecies('mythic'),rarity:'mythic' as const,region_name:'퐁당섬',caught_at:new Date().toISOString(),created_at:new Date().toISOString(),my_reaction:null,reactions:{}}
 const router=createMemoryRouter([{path:'/',element:<ShowcaseReactionPeopleDialog post={post} initialReaction="love" onClose={()=>{}}/>}])
 render(<RouterProvider router={router}/>)
 await screen.findByRole('alert');fireEvent.click(screen.getByRole('button',{name:'다시 불러오기'}))
 await screen.findByText('아직 이 반응을 남긴 사람이 없어요.')
 expect(mock.people).toHaveBeenLastCalledWith('post','love',0)
})
