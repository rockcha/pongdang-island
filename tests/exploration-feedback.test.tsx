import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react'
import {writeFileSync} from 'node:fs'
import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import {ExplorationFeedback} from '@/features/exploration/exploration-feedback'
import {appQueryClient,setQueryAccount} from '@/lib/account-cache'
import * as api from '@/features/exploration/feedback-api'
vi.mock('@/features/exploration/feedback-api',async original=>({...await original<typeof import('@/features/exploration/feedback-api')>(),readExplorationFeedback:vi.fn(),writeExplorationFeedback:vi.fn()}))
const auth=vi.hoisted(()=>({owner:'one'}))
vi.mock('@/components/auth-provider',()=>({useAuth:()=>({session:{user:{id:auth.owner}},recovery:false})}))
vi.mock('@/features/profile/player-avatar',()=>({PlayerAvatar:({nickname,className}:any)=><img alt={nickname} className={className} src="/branding/pongi.png"/>}))
const own:api.ExplorationComment={id:'own',authorId:'one',nickname:'퐁이',avatarPath:null,body:'초반 난이도가 좋아요.',createdAt:'2026-10-31T12:00:00Z',updatedAt:'2026-10-31T12:00:00Z',canEdit:true,canDelete:true}
const other={...own,id:'other',authorId:'two',nickname:'다른 탐험가',body:'상인을 더 만나고 싶어요.',canEdit:false,canDelete:false}
beforeEach(()=>{auth.owner='one';setQueryAccount('one');vi.mocked(api.readExplorationFeedback).mockResolvedValue({items:[own,other],hasMore:false});vi.mocked(api.writeExplorationFeedback).mockResolvedValue()})
afterEach(()=>{cleanup();setQueryAccount(null);appQueryClient.clear();vi.resetAllMocks()})
it('shows public author comments, saves an individual comment, and restricts editing controls',async()=>{
 render(<ExplorationFeedback owner="one"/>);await screen.findByText(other.body)
 if(process.env.FEEDBACK_UI_QA)writeFileSync('artifacts/exploration-feedback.fragment.html',document.querySelector('.exploration-feedback')!.outerHTML)
 expect(screen.getByRole('button',{name:'퐁이 댓글 수정'})).toBeTruthy();expect(screen.queryByRole('button',{name:'다른 탐험가 댓글 삭제'})).toBeNull()
 fireEvent.change(screen.getByRole('textbox',{name:'탐험 피드백 내용'}),{target:{value:' 새 피드백 '}})
 fireEvent.click(screen.getByRole('button',{name:'댓글 남기기'}))
 await waitFor(()=>expect(api.writeExplorationFeedback).toHaveBeenCalledWith({action:'add',id:expect.any(String),body:'새 피드백'}))
 await waitFor(()=>expect(screen.getByRole('textbox')).toHaveProperty('value',''))
 fireEvent.click(screen.getByRole('button',{name:'퐁이 댓글 수정'}))
 fireEvent.change(screen.getByRole('textbox'),{target:{value:'수정 내용'}});fireEvent.click(screen.getByRole('button',{name:'수정 저장'}))
 await waitFor(()=>expect(api.writeExplorationFeedback).toHaveBeenLastCalledWith({action:'edit',id:'own',body:'수정 내용'}))
})
it('retains the same comment UUID and body after an uncertain save and blocks duplicate submits',async()=>{
 vi.mocked(api.writeExplorationFeedback).mockRejectedValueOnce(Error('network'))
 render(<ExplorationFeedback owner="one"/>);await screen.findByText(own.body)
 fireEvent.change(screen.getByRole('textbox'),{target:{value:'네트워크 재시도'}});fireEvent.click(screen.getByRole('button',{name:'댓글 남기기'}))
 await screen.findByRole('alert');const original=vi.mocked(api.writeExplorationFeedback).mock.calls[0][0]
 expect(screen.getByRole('textbox')).toHaveProperty('disabled',true)
 fireEvent.click(screen.getByRole('button',{name:'같은 요청 다시 확인'}))
 await waitFor(()=>expect(api.writeExplorationFeedback).toHaveBeenLastCalledWith(original))
 await waitFor(()=>expect(screen.getByRole('textbox')).toHaveProperty('value',''))
})
it('confirms deletion while preserving an unrelated draft',async()=>{
 render(<ExplorationFeedback owner="one"/>);await screen.findByText(own.body)
 fireEvent.change(screen.getByRole('textbox'),{target:{value:'아직 쓰는 글'}})
 fireEvent.click(screen.getByRole('button',{name:'퐁이 댓글 삭제'}));expect(api.writeExplorationFeedback).not.toHaveBeenCalled()
 fireEvent.click(screen.getByRole('button',{name:'삭제',exact:true}))
 await waitFor(()=>expect(api.writeExplorationFeedback).toHaveBeenCalledWith({action:'delete',id:'own'}))
 expect(screen.getByRole('textbox')).toHaveProperty('value','아직 쓰는 글')
})
it('keeps pages separate and clears old-account comments and drafts on an account switch',async()=>{
 vi.mocked(api.readExplorationFeedback).mockImplementation(async(_signal,offset)=>({items:offset?[{...other,id:'page-two',body:'다음 페이지'}]:[own],hasMore:!offset}))
 const view=render(<ExplorationFeedback key="one" owner="one"/>);await screen.findByText(own.body)
 fireEvent.click(screen.getByRole('button',{name:'다음',exact:true}));await screen.findByText('다음 페이지')
 expect(api.readExplorationFeedback).toHaveBeenCalledWith(expect.any(AbortSignal),20)
 fireEvent.change(screen.getByRole('textbox'),{target:{value:'이전 계정 초안'}})
 auth.owner='two';setQueryAccount('two');vi.mocked(api.readExplorationFeedback).mockResolvedValue({items:[],hasMore:false})
 view.rerender(<ExplorationFeedback key="two" owner="two"/>);await screen.findByText('첫 탐험 피드백을 남겨주세요.')
 expect(screen.queryByText(own.body)).toBeNull();expect(screen.getByRole('textbox')).toHaveProperty('value','')
})
it('offers a reload on read failures without losing the composer',async()=>{
 vi.mocked(api.readExplorationFeedback).mockRejectedValueOnce(Error('offline'))
 render(<ExplorationFeedback owner="one"/>);await screen.findByRole('alert')
 fireEvent.click(screen.getByRole('button',{name:'다시 불러오기'}));await screen.findByText(other.body)
 expect(screen.getByRole('textbox')).toBeTruthy()
})
