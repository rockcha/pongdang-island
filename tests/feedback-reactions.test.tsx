import {cleanup,render,screen,fireEvent,waitFor} from '@testing-library/react'
import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import {FeedbackReactions,FeedbackVoteButtons} from '@/features/board/feedback-reactions'
const rpc=vi.hoisted(()=>vi.fn())
vi.mock('@/lib/client',()=>({createClient:()=>({rpc})}))
vi.mock('@/components/auth-provider',()=>({useAuth:()=>({session:{user:{id:'me'}}})}))
beforeEach(()=>rpc.mockReset())
afterEach(()=>{cleanup();vi.useRealTimers()})
it('loads a batch, selects a vote, cancels it and permits switching sides',async()=>{
 rpc.mockResolvedValueOnce({data:[{id:'one',likes:2,dislikes:0,my_reaction:0}],error:null})
 render(<FeedbackReactions kind="suggestion" ids={['one']}><FeedbackVoteButtons id="one"/></FeedbackReactions>)
 const like=screen.getByRole('button',{name:'추천'}),dislike=screen.getByRole('button',{name:'비추천'})
 await waitFor(()=>expect(like.hasAttribute('disabled')).toBe(false))
 expect(rpc).toHaveBeenCalledWith('feedback_reactions',{p_kind:'suggestion',p_ids:['one']})
 for(const [button,input,result] of [[like,1,1],[like,0,0],[dislike,-1,-1]] as const){
  rpc.mockResolvedValueOnce({data:{id:'one',likes:result===1?3:2,dislikes:result===-1?1:0,my_reaction:result},error:null})
  fireEvent.click(button)
  await waitFor(()=>expect(rpc).toHaveBeenLastCalledWith('set_feedback_reaction',{p_kind:'suggestion',p_id:'one',p_value:input}))
  await waitFor(()=>expect(button.getAttribute('aria-pressed')).toBe(String(result!==0)))
 }
})
it('keeps the vote unchanged when saving fails and allows retry',async()=>{
 rpc.mockResolvedValueOnce({data:[{id:'one',likes:0,dislikes:0,my_reaction:0}],error:null})
 render(<FeedbackReactions kind="bug" ids={['one']}><FeedbackVoteButtons id="one"/></FeedbackReactions>)
 const like=screen.getByRole('button',{name:'추천'})
 await waitFor(()=>expect(like.hasAttribute('disabled')).toBe(false))
 rpc.mockResolvedValueOnce({data:null,error:{message:'offline'}})
 fireEvent.click(like)
 await screen.findByRole('alert')
 expect(like.getAttribute('aria-pressed')).toBe('false')
 expect(like.hasAttribute('disabled')).toBe(false)
})
