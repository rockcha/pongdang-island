import {beforeEach,expect,it,vi} from 'vitest'
const mock=vi.hoisted(()=>({rpc:vi.fn(),storage:vi.fn()}))
vi.mock('@/lib/client',()=>({createClient:()=>({rpc:mock.rpc,get storage(){mock.storage();throw new Error('Showcase must not access Storage')}})}))
import {loadShowcase,publishShowcase,reactToShowcase,deleteShowcase,showcaseError} from '@/features/showcase/api'
beforeEach(()=>{vi.clearAllMocks();mock.rpc.mockResolvedValue({data:{items:[],total:0},error:null})})
it('distinguishes an invalid reaction from a caption validation error',()=>{
 expect(showcaseError({message:'INVALID_SHOWCASE_REACTION'})).toBe('이 반응을 저장하지 못했어요. 새로고침 후 다시 시도해주세요.')
 expect(showcaseError({message:'INVALID_SHOWCASE'})).toContain('200자')
})
it.each(['sad','angry'] as const)('sends the %s reaction unchanged and allows cancellation',async reaction=>{
 await reactToShowcase('post-id',reaction)
 await reactToShowcase('post-id',null)
 expect(mock.rpc.mock.calls).toEqual([
  ['react_fishing_showcase',{p_post_id:'post-id',p_reaction:reaction}],
  ['react_fishing_showcase',{p_post_id:'post-id',p_reaction:null}],
 ])
})
it('loads, publishes, reacts and deletes using DB RPCs only',async()=>{
 await loadShowcase(false,0)
 await publishShowcase('catch-id','드디어 만났다!')
 await reactToShowcase('post-id','celebrate')
 await deleteShowcase('post-id')
 expect(mock.rpc.mock.calls).toEqual([
  ['showcase_feed',{p_mine:false,p_offset:0}],
  ['publish_fishing_showcase',{p_operation_id:'catch-id',p_caption:'드디어 만났다!'}],
  ['react_fishing_showcase',{p_post_id:'post-id',p_reaction:'celebrate'}],
  ['delete_fishing_showcase',{p_post_id:'post-id'}],
 ])
 expect(mock.storage).not.toHaveBeenCalled()
})
