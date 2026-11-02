import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react'
import {writeFileSync} from 'node:fs'
import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import {ExplorationPage} from '@/features/exploration/exploration-page'
import {GameTabs} from '@/features/arcade/game-controls'
import {appQueryClient,setQueryAccount} from '@/lib/account-cache'
import * as api from '@/features/exploration/ranking-api'
const auth=vi.hoisted(()=>({owner:'one' as string|undefined}))
vi.mock('@/components/auth-provider',()=>({useAuth:()=>({session:auth.owner?{user:{id:auth.owner}}:null,recovery:false}),getNickname:()=> '탐험가'}))
vi.mock('@/features/notices/use-operator',()=>({useOperator:()=>({operator:false,loading:false})}))
vi.mock('@/features/social/social-provider',()=>({useSocial:()=>({profile:{},requests:[]})}))
vi.mock('@/features/profile/player-avatar',()=>({PlayerAvatar:({nickname,className}:any)=><img alt={nickname} className={className} src="/branding/pongi.png"/>}))
vi.mock('@/features/exploration/exploration-game',()=>({ExplorationGame:()=>null}))
vi.mock('@/features/exploration/verified-exploration-game',()=>({VerifiedExplorationGame:()=>null}))
vi.mock('@/features/exploration/codex',()=>({ExplorationCodex:()=>null}))
vi.mock('@/features/exploration/exploration-feedback',()=>({ExplorationFeedback:()=> <input aria-label="피드백 초안"/>}))
vi.mock('@/features/exploration/ranking-api',()=>({readExplorationRanking:vi.fn()}))
const top={id:'record',userId:'one',rank:1,nickname:'탐험퐁이',mine:true,floor:50,completed:true,avatarPath:null,level:12,levelProgress:.5,friendCode:null}
beforeEach(()=>{
 auth.owner='one';setQueryAccount('one')
 vi.mocked(api.readExplorationRanking).mockImplementation(async(_s,offset=0)=>({rows:offset?[{...top,id:'next',userId:'two',rank:21,nickname:'다음 탐험가',mine:false,floor:25,completed:false,friendCode:'PONGI123'}]:[top,{...top,id:'second',rank:2,userId:'two',nickname:'지하를 걷는 탐험가',mine:false,floor:49,completed:false},{...top,id:'third',rank:3,userId:'three',nickname:'모래바람',mine:false,floor:35,completed:false}],offset,total:21}))
})
afterEach(()=>{cleanup();setQueryAccount(null);appQueryClient.clear();vi.resetAllMocks()})
it('adds a third tab, preserves feedback drafts, and shows ordinary ranking rows without weekly rewards',async()=>{
 render(<ExplorationPage/>);expect(api.readExplorationRanking).not.toHaveBeenCalled()
 expect(screen.getAllByRole('tab').map(t=>t.textContent)).toEqual(['게임 플레이','피드백','랭킹'])
 fireEvent.click(screen.getByRole('tab',{name:'피드백'}));fireEvent.change(screen.getByRole('textbox'),{target:{value:'작성 중인 의견'}})
 fireEvent.click(screen.getByRole('tab',{name:'랭킹'}));await screen.findByText('50층 완료')
 expect(screen.getByRole('tabpanel')).toHaveProperty('id','exploration-rank-panel')
 expect(screen.getByText('내 기록')).toBeTruthy();expect(screen.queryByText('주간 랭킹 보상')).toBeNull()
 if(process.env.EXPLORATION_RANK_QA)writeFileSync('artifacts/exploration-ranking.fragment.html',document.querySelector('.exploration-lobby')!.outerHTML)
 fireEvent.click(screen.getByRole('button',{name:'다음',exact:true}));await screen.findByText('지하 25층')
 expect(api.readExplorationRanking).toHaveBeenLastCalledWith(expect.any(AbortSignal),20)
 expect(screen.getByRole('button',{name:/친구 요청/})).toBeTruthy()
 fireEvent.click(screen.getByRole('tab',{name:'피드백'}));expect(screen.getByRole('textbox')).toHaveProperty('value','작성 중인 의견')
 fireEvent.keyDown(screen.getByRole('tab',{name:'피드백'}),{key:'ArrowRight'});expect(screen.getByRole('tab',{name:'랭킹'}).getAttribute('aria-selected')).toBe('true')
 fireEvent.keyDown(screen.getByRole('tab',{name:'랭킹'}),{key:'Home'});expect(screen.getByRole('tab',{name:'게임 플레이'}).getAttribute('aria-selected')).toBe('true')
})
it('shows errors with retry and clears previous-account rankings after switching accounts',async()=>{
 vi.mocked(api.readExplorationRanking).mockRejectedValueOnce(Error('offline'))
 const view=render(<ExplorationPage/>);fireEvent.click(screen.getByRole('tab',{name:'랭킹'}));await screen.findByRole('alert')
 fireEvent.click(screen.getByRole('button',{name:'순위 새로고침'}));await screen.findByText('50층 완료')
 auth.owner='two';setQueryAccount('two');vi.mocked(api.readExplorationRanking).mockResolvedValue({rows:[],offset:0,total:0})
 view.rerender(<ExplorationPage/>);await screen.findByText('첫 탐험 기록에 도전해보세요.')
 expect(screen.queryByText('탐험퐁이')).toBeNull()
})
it('requires login without issuing a ranking request and keeps existing two-tab game controls working',async()=>{
 auth.owner=undefined;setQueryAccount(null);const view=render(<ExplorationPage/>)
 fireEvent.click(screen.getByRole('tab',{name:'랭킹'}));expect(screen.getByText('로그인 후 탐험 랭킹을 볼 수 있어요.')).toBeTruthy();expect(api.readExplorationRanking).not.toHaveBeenCalled()
 view.unmount();const change=vi.fn();render(<GameTabs id="other" value="game" onChange={change}/>)
 expect(screen.getAllByRole('tab')).toHaveLength(2)
 fireEvent.keyDown(screen.getByRole('tab',{name:'게임 플레이'}),{key:'ArrowLeft'});expect(change).toHaveBeenCalledWith('rank')
 await waitFor(()=>expect(document.activeElement).toBe(screen.getByRole('tab',{name:'랭킹'})))
})
