import {cleanup,render,screen,waitFor} from '@testing-library/react'
import {MemoryRouter} from 'react-router'
import {afterEach,expect,it,vi} from 'vitest'
import {FeedbackAuthors,FeedbackPostRow} from '@/features/board/feedback-post-row'
const rpc=vi.hoisted(()=>vi.fn())
vi.mock('@/lib/client',()=>({createClient:()=>({rpc})}))
vi.mock('@/components/auth-provider',()=>({useAuth:()=>({session:{user:{id:'me'}}})}))
vi.mock('@/features/profile/player-avatar',()=>({PlayerAvatar:({nickname,path}:{nickname:string;path?:string})=><img alt={`${nickname}의 아바타`} data-path={path}/>}))
afterEach(()=>{cleanup();vi.clearAllMocks()})
it('batches author images for visible posts and keeps NEW out of the post list',async()=>{
 rpc.mockResolvedValue({data:[{id:'one',avatar_path:'author/avatar.webp'},{id:'two',avatar_path:null}],error:null})
 const post={author_name:'섬친구',created_at:new Date().toISOString(),title:'새로운 바다',body:'바다를 더 만들어주세요.'}
 render(<MemoryRouter><FeedbackAuthors kind="suggestion" ids={['one','two']}><ul>
  <FeedbackPostRow post={{...post,id:'one'}} to="/square/suggestions/one"/>
  <FeedbackPostRow post={{...post,id:'two'}} to="/square/suggestions/two"/>
 </ul></FeedbackAuthors></MemoryRouter>)
 await waitFor(()=>expect(screen.getAllByAltText('섬친구의 아바타')[0].getAttribute('data-path')).toBe('author/avatar.webp'))
 expect(rpc).toHaveBeenCalledExactlyOnceWith('feedback_authors',{p_kind:'suggestion',p_ids:['one','two']})
 expect(screen.queryByText('NEW')).toBeNull()
 expect(screen.getAllByText('방금 전')).toHaveLength(2)
 expect(screen.getAllByRole('link')[0].getAttribute('href')).toBe('/square/suggestions/one')
 expect(screen.getAllByRole('link')[0].querySelector('button')).toBeNull()
})
