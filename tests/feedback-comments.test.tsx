import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react'
import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import {FeedbackComments} from '@/features/board/feedback-comments'
const mock=vi.hoisted(()=>({load:vi.fn(),action:vi.fn()}))
vi.mock('@/features/board/feedback-comments-api',()=>({loadFeedbackComments:mock.load,feedbackCommentAction:mock.action}))
vi.mock('@/components/auth-provider',()=>({useAuth:()=>({session:{user:{id:'me'}}})}))
vi.mock('@/features/profile/player-avatar',()=>({PlayerAvatar:()=>null}))
const comment={id:'comment',author_id:'me',author_name:'낚시꾼',body:'기존 댓글',created_at:'2026-10-21T00:00:00Z',updated_at:'2026-10-21T00:00:00Z',avatar_path:null}
beforeEach(()=>{vi.clearAllMocks();mock.load.mockResolvedValue({items:[comment],total:1});mock.action.mockResolvedValue('saved')})
afterEach(cleanup)
it('retains the caption and uses the same comment ID on publication retry',async()=>{
 mock.action.mockRejectedValueOnce(new Error('offline'))
 render(<FeedbackComments kind="suggestion" id="post"/>)
 await screen.findByText('기존 댓글')
 fireEvent.change(screen.getByRole('textbox',{name:'댓글 내용'}),{target:{value:'새 댓글'}})
 fireEvent.click(screen.getByRole('button',{name:'등록'}))
 await screen.findByRole('alert')
 expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe('새 댓글')
 const id=mock.action.mock.calls[0][3]
 fireEvent.click(screen.getByRole('button',{name:'등록'}))
 await waitFor(()=>expect(mock.action).toHaveBeenCalledTimes(2))
 expect(mock.action).toHaveBeenLastCalledWith('suggestion','post','add',id,'새 댓글')
 await waitFor(()=>expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe(''))
})
it('edits the authors comment and hides controls for other players comments',async()=>{
 const view=render(<FeedbackComments kind="bug" id="post"/>)
 fireEvent.click(await screen.findByRole('button',{name:'댓글 수정'}))
 fireEvent.change(screen.getByRole('textbox'),{target:{value:'수정 내용'}})
 fireEvent.click(screen.getByRole('button',{name:'저장'}))
 await waitFor(()=>expect(mock.action).toHaveBeenCalledWith('bug','post','edit','comment','수정 내용'))
 mock.load.mockResolvedValue({items:[{...comment,author_id:'other'}],total:1})
 view.rerender(<FeedbackComments kind="bug" id="another"/>)
 await screen.findByText('기존 댓글')
 expect(screen.queryByRole('button',{name:'댓글 삭제'})).toBeNull()
 expect(screen.queryByRole('button',{name:'댓글 수정'})).toBeNull()
})
it('offers retry after a read failure',async()=>{
 mock.load.mockRejectedValueOnce(new Error('offline'))
 render(<FeedbackComments kind="bug" id="post"/>)
 fireEvent.click(await screen.findByRole('button',{name:'다시 불러오기'}))
 await screen.findByText('기존 댓글')
})
