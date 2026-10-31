import {useState} from 'react'
import {cleanup,fireEvent,render,screen,waitFor,within} from '@testing-library/react'
import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import {ExplorationPage} from '@/features/exploration/exploration-page'
import {MerchantRoom} from '@/features/exploration/merchant-room'
import {LootDialog} from '@/features/exploration/loot-dialog'
import {buyMerchantItem,grantPracticeSupplies,newPractice,type PracticeState} from '@/features/exploration/practice-state'
import {drawRoomLoot} from '@/features/exploration/room-loot'
import {drawPracticeFloor} from '@/features/exploration/campaign'
import {seededRandom} from '../scripts/exploration/simulation'
import {setQueryAccount,appQueryClient} from '@/lib/account-cache'
import * as api from '@/features/exploration/feedback-api'
import {writeFileSync,readFileSync,readdirSync} from 'node:fs'
vi.mock('@/features/notices/use-operator',()=>({useOperator:()=>({operator:false,loading:false})}))
vi.mock('@/components/auth-provider',()=>({useAuth:()=>({session:{user:{id:'ordinary-player'}},recovery:false}),getNickname:()=> '일반 유저'}))
vi.mock('@/features/social/social-provider',()=>({useSocial:()=>({profile:{avatar_path:null}})}))
vi.mock('@/features/profile/player-avatar',()=>({PlayerAvatar:()=> <img src="/branding/pongi.png"/>}))
vi.mock('@/features/exploration/feedback-api',async original=>({...await original<typeof import('@/features/exploration/feedback-api')>(),readExplorationFeedback:vi.fn(),writeExplorationFeedback:vi.fn()}))
vi.mock('@/features/gold/purchase-sound',()=>({playPurchaseSound:vi.fn()}))
beforeEach(()=>{setQueryAccount('ordinary-player');vi.mocked(api.readExplorationFeedback).mockResolvedValue({items:[],hasMore:false});vi.mocked(api.writeExplorationFeedback).mockResolvedValue()})
afterEach(()=>{cleanup();setQueryAccount(null);appQueryClient.clear();vi.clearAllMocks()})
function capture(name:string){
 if(!process.env.EXPLORATION_USABILITY_QA)return
 const root=process.cwd().replaceAll('\\','/'),css=readdirSync('dist/assets').filter(x=>/^(index|exploration-page)-.*\.css$/.test(x)).sort((a,b)=>Number(a.startsWith('exploration'))-Number(b.startsWith('exploration'))).map(x=>readFileSync('dist/assets/'+x,'utf8')).join('\n');
 const html=document.body.innerHTML.replaceAll('data-starting-style=""','').replace(/([="(;])\/exploration\//g,`$1file:///${root}/public/exploration/`).replaceAll('/branding/',`file:///${root}/public/branding/`).replaceAll('/regions/',`file:///${root}/public/regions/`)
 writeFileSync(`artifacts/usability-${name}.html`,`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}body{margin:0}*,*::before,*::after{animation:none!important;transition:none!important}</style>${html}`)
}
it('lets an ordinary player open the feedback tab, submit and keep drafts across tabs',async()=>{
 render(<ExplorationPage/>);expect(screen.queryByRole('textbox')).toBeNull()
 fireEvent.click(screen.getByRole('tab',{name:'피드백하기'}));await screen.findByText('첫 탐험 피드백을 남겨주세요.')
 expect(screen.queryByRole('button',{name:'실전연습'})).toBeNull()
 const text=screen.getByRole('textbox',{name:'탐험 피드백 내용'});expect(text).toHaveProperty('disabled',false)
 fireEvent.change(text,{target:{value:'일반 사용자도 댓글을 남겨요'}});capture('feedback')
 fireEvent.click(screen.getByRole('tab',{name:'플레이하기'}));expect(screen.getByRole('button',{name:'실전연습'})).toBeTruthy()
 fireEvent.keyDown(screen.getByRole('tab',{name:'플레이하기'}),{key:'ArrowRight'});expect(screen.getByRole('textbox')).toHaveProperty('value','일반 사용자도 댓글을 남겨요')
 fireEvent.click(screen.getByRole('button',{name:'댓글 남기기'}));await waitFor(()=>expect(api.writeExplorationFeedback).toHaveBeenCalledWith({action:'add',id:expect.any(String),body:'일반 사용자도 댓글을 남겨요'}))
})
it('keeps the codex header inside a separate scrolling dialog',()=>{
 render(<ExplorationPage/>);fireEvent.click(screen.getByRole('button',{name:'도감'}));capture('codex')
 expect(screen.getByRole('dialog',{name:'도감'})).toBeTruthy();expect(screen.getByRole('tabpanel',{name:'무기 45'})).toBeTruthy()
})
it('shows owned equipment and compares each replacement before charging a full-bag purchase',()=>{
 const initial=grantPracticeSupplies(newPractice(()=>0));let latest=initial
 function Shop(){const [state,setState]=useState(initial);latest=state;return <MerchantRoom state={state} onChange={setState} onDescend={()=>{}} onTalk={()=>{}}/>}
 render(<Shop/>);fireEvent.click(screen.getByRole('button',{name:'구매한다'}));capture('shop')
 fireEvent.click(screen.getByRole('button',{name:'내 장비',exact:true}));expect(screen.getByRole('region',{name:'내 장비'}).textContent).toContain('청동 단검')
 fireEvent.click(screen.getByRole('button',{name:'무기',exact:true}));fireEvent.click(within(screen.getByRole('region',{name:'무기'})).getAllByRole('button',{name:'구매',exact:true})[0])
 const comparison=screen.getByRole('region',{name:'구매 장비 비교'});expect(within(comparison).getAllByRole('radio')).toHaveLength(3);expect(comparison.textContent).toContain('공격력');expect(comparison.textContent).toContain('치명타');capture('replacement')
 fireEvent.click(screen.getByRole('button',{name:'교체하지 않기'}));expect(latest).toBe(initial)
 fireEvent.click(within(screen.getByRole('region',{name:'무기'})).getAllByRole('button',{name:'구매',exact:true})[0]);fireEvent.click(screen.getAllByRole('radio')[0]);fireEvent.click(screen.getByRole('button',{name:/교체하고 구매/}))
 expect(latest.gold).toBeLessThan(initial.gold);expect(latest.weapons).toHaveLength(3);expect(latest.weapons.some(item=>item.id===initial.weaponId)).toBe(false);expect(latest.weapons.some(item=>item.id===latest.weaponId)).toBe(true)
})
it('allows leaving full-bag loot without replacing equipment',()=>{
 const state=grantPracticeSupplies(newPractice()),loot=drawRoomLoot(state,'starter',()=>0),claim=vi.fn(),decline=vi.fn()
 render(<LootDialog loot={loot} state={state} onClaim={claim} onDecline={decline}/>);expect(screen.getAllByRole('radio')).toHaveLength(3);capture('loot')
 fireEvent.click(screen.getByRole('button',{name:'교체하지 않기'}));expect(decline).toHaveBeenCalledOnce();expect(claim).not.toHaveBeenCalled()
})
it('rejects invalid or unaffordable replacements without changing gold or gear',()=>{
 const state=grantPracticeSupplies(newPractice(()=>0)),id=state.market.weaponIds[0]
 expect(buyMerchantItem(state,id,1,'missing')).toBe(state)
 const poor={...state,gold:0};expect(buyMerchantItem(poor,id,1,state.weaponId)).toBe(poor)
})
it('never puts either type of merchant on floor one and preserves the fixed floor-three shop',()=>{
 for(let seed=0;seed<500;seed++){expect(drawPracticeFloor(1,seededRandom(seed)).doors.some(id=>id.startsWith('merchant-')||id.startsWith('magic-'))).toBe(false);expect(drawPracticeFloor(3,seededRandom(seed)).doors).toContain('merchant-hasan')}
})
