import {beforeEach,expect,it,vi} from 'vitest'
const mock=vi.hoisted(()=>({rpc:vi.fn(),storage:vi.fn()}))
vi.mock('@/lib/client',()=>({createClient:()=>({rpc:mock.rpc,get storage(){mock.storage();throw new Error('Showcase must not access Storage')}})}))
import {loadShowcase,publishShowcase,reactToShowcase,deleteShowcase} from '@/features/showcase/api'
beforeEach(()=>{vi.clearAllMocks();mock.rpc.mockResolvedValue({data:{items:[],total:0},error:null})})
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
