import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import ShadowGame from '@/features/arcade/shadow-game'
import type { ShadowState } from '@/features/arcade/shadow-api'
const mocks=vi.hoisted(()=>({action:vi.fn(),board:vi.fn(),refresh:vi.fn()}))
vi.mock('@/features/arcade/shadow-api',()=>({shadowAction:mocks.action,shadowLeaderboard:mocks.board,shadowError:()=> '연결 오류'}))
vi.mock('@/components/auth-provider',()=>({useAuth:()=>({session:{user:{id:'me'}}})}))
vi.mock('@/features/gold/gold-provider',()=>({GoldIcon:()=> <span />,useGold:()=>({wallet:{gold:100},loading:false,busy:false,error:'',refresh:mocks.refresh})}))
vi.mock('@/features/collection/api',()=>({collectibleUrl:(path:string)=>'/images/'+path,loadCollection:async()=>({catalog:['a','b','c','d'].map(id=>({id,name:id,kind:'fish',thumbnail_path:id+'.png'}))})}))
afterEach(()=>cleanup())
function state(expired=false):ShadowState{return {serverNow:new Date().toISOString(),run:{id:'run',score:0,lives:3,finished:false,round:{id:'round',number:1,imagePath:'fish.png',options:[{id:'a',name:'물고기 A'},{id:'b',name:'쓰레기 B'},{id:'c',name:'장식 C'},{id:'d',name:'물고기 D'}],deadline:new Date(Date.now()+(expired?-1000:10000)).toISOString(),answered:false,correct:null,timedOut:null,answerName:null}}}}
beforeEach(()=>{vi.clearAllMocks();mocks.board.mockResolvedValue({rows:[],total:0,pageSize:20,offset:0})})
it('starts and answers practice without sending a start or answer RPC or refreshing gold',async()=>{
 mocks.action.mockResolvedValue({serverNow:new Date().toISOString(),run:null})
 render(<ShadowGame />)
 const practice=await screen.findByRole('button',{name:'연습'})
 await waitFor(()=>expect(practice.hasAttribute('disabled')).toBe(false))
 fireEvent.click(practice)
 const game=await screen.findByRole('region',{name:'그림자 문제'})
 fireEvent.click(within(game).getAllByRole('button')[0])
 await screen.findByRole('button',{name:'다음 문제'})
 expect(mocks.action.mock.calls.map(([args])=>args.p_action)).toEqual(['state'])
 expect(mocks.refresh).not.toHaveBeenCalled()
})
it('shows four names and a silhouette, reveals the server answer, then explicitly loads the next question',async()=>{
 const initial=state(),answered={...initial,run:{...initial.run!,score:1,round:{...initial.run!.round,answered:true,correct:true,answerName:'물고기 A'}}}
 mocks.action.mockResolvedValueOnce(initial).mockResolvedValueOnce(answered).mockResolvedValueOnce({...initial,run:{...initial.run!,score:1,round:{...initial.run!.round,id:'round2',number:2}}})
 render(<ShadowGame />)
 const game=await screen.findByRole('region',{name:'그림자 문제'})
 expect(within(game).getByRole('img',{name:'맞혀야 할 개체의 그림자'}).style.filter).toBe('brightness(0)')
 expect(within(game).getAllByRole('button')).toHaveLength(4)
 fireEvent.click(within(game).getByRole('button',{name:'물고기 A'}))
 await screen.findByRole('status',{name:'정답'})
 expect(mocks.action).toHaveBeenCalledWith({p_action:'answer',p_run_id:'run',p_round_id:'round',p_choice_id:'a'})
 expect(screen.getByRole('img',{name:'물고기 A'}).style.filter).toBe('none')
 fireEvent.click(screen.getByRole('button',{name:'다음 문제'}))
 await screen.findByText('2번째 문제')
 expect(mocks.action).toHaveBeenCalledWith({p_action:'next',p_run_id:'run',p_round_id:'round'})
})
it('submits an expired question once and displays the completed score and refreshed top ranks',async()=>{
 const initial=state(true),finished={...initial,run:{...initial.run!,score:5,lives:0,finished:true,round:{...initial.run!.round,answered:true,correct:false,timedOut:true,answerName:'장식 C'}}}
 mocks.action.mockResolvedValueOnce(initial).mockResolvedValueOnce(finished)
 mocks.board.mockResolvedValue({rows:[{id:'record',rank:1,score:5,nickname:'여행자',mine:true,finishedAt:new Date().toISOString()}],total:1,pageSize:20,offset:0})
 render(<ShadowGame />)
 await screen.findByRole('status',{name:'오답'})
 fireEvent.click(screen.getByRole('button',{name:'결과 보기'}))
 await screen.findByText('5개 정답!')
 expect(screen.queryByText('마지막 정답: 장식 C',{exact:false})).toBeNull()
 fireEvent.click(screen.getByRole('tab',{name:'랭킹'}))
 await screen.findByText('1등')
 await waitFor(()=>expect(mocks.action.mock.calls.filter(([a])=>a.p_action==='answer')).toHaveLength(1))
 expect(mocks.action).toHaveBeenCalledWith({p_action:'answer',p_run_id:'run',p_round_id:'round'})
})
