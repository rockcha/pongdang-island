import {act,cleanup,fireEvent,render,screen,waitFor,within} from '@testing-library/react'
import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import {SponsorshipScreen} from '@/features/sponsorship/sponsorship-page'
import type {Sponsorship,SponsorshipDraft} from '@/features/sponsorship/api'
vi.mock('@/features/profile/player-avatar',()=>({PlayerAvatar:({nickname}:{nickname:string})=><img alt={`${nickname}의 아바타`}/>}))
vi.mock('sonner',()=>({toast:{success:vi.fn(),error:vi.fn()}}))
const post:Sponsorship={id:'post',owner:{id:'donor',nickname:'다정한퐁이',avatarPath:null},goldEach:500,slots:2,claimedCount:1,totalGold:1000,message:'행운을 함께 나눠요!',status:'active',createdAt:'2026-10-25T16:00:00Z',closedAt:null,mine:false,received:false,recipients:[{id:'first',nickname:'첫번째퐁이',avatarPath:null,slot:1,claimedAt:'2026-10-25T16:01:00Z'}]}
const api={loadSponsorships:vi.fn(),loadSponsorship:vi.fn(),createSponsorship:vi.fn(),claimSponsorship:vi.fn(),cancelSponsorship:vi.fn()}
beforeEach(()=>{vi.clearAllMocks();api.loadSponsorships.mockResolvedValue({items:[post],hasMore:false});api.loadSponsorship.mockResolvedValue(post)})
afterEach(cleanup)
it('shows the amount, remaining slots, names and avatars and closes the final slot after receiving',async()=>{
 let resolve!:(value:Sponsorship)=>void
 api.claimSponsorship.mockImplementation(()=>new Promise<Sponsorship>(r=>{resolve=r}))
 render(<SponsorshipScreen owner="me" gold={5000} service={api}/>)
 const button=await screen.findByRole('button',{name:'500골드 받기'})
 expect(screen.getByText('1자리가 남았어요')).toBeTruthy()
 expect(screen.getByText('첫번째퐁이')).toBeTruthy()
 expect(screen.getByAltText('첫번째퐁이의 아바타')).toBeTruthy()
 fireEvent.click(button);fireEvent.click(button)
 expect(api.claimSponsorship).toHaveBeenCalledTimes(1)
 await act(async()=>resolve({...post,claimedCount:2,status:'completed',received:true,recipients:[...post.recipients,{id:'me',nickname:'나퐁이',avatarPath:null,slot:2,claimedAt:post.createdAt}]}))
 await screen.findByText('500골드 받았어요')
 expect(screen.getByText('후원 완료')).toBeTruthy()
 expect(screen.queryByRole('button',{name:'500골드 받기'})).toBeNull()
 expect(screen.getByText('나퐁이')).toBeTruthy()
})
it('shows the total before posting and retries an uncertain registration with the same operation ID',async()=>{
 api.createSponsorship.mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce({...post,mine:true})
 render(<SponsorshipScreen owner="me" gold={10000} service={api}/>)
 fireEvent.click(screen.getByRole('button',{name:'후원하기'}))
 const dialog=screen.getByRole('dialog')
 fireEvent.change(within(dialog).getByLabelText('1인당 골드'),{target:{value:'200'}})
 fireEvent.change(within(dialog).getByLabelText('받을 인원'),{target:{value:'3'}})
 fireEvent.change(within(dialog).getByLabelText(/함께 남길 한마디/),{target:{value:'고마워요'}})
 fireEvent.click(within(dialog).getByRole('button',{name:'600골드로 후원 열기'}))
 await within(dialog).findByRole('alert')
 const first=api.createSponsorship.mock.calls[0][0] as SponsorshipDraft
 expect(first).toMatchObject({goldEach:200,slots:3,message:'고마워요'})
 fireEvent.click(within(dialog).getByRole('button',{name:'600골드로 후원 열기'}))
 await waitFor(()=>expect(api.createSponsorship).toHaveBeenCalledTimes(2))
 expect(api.createSponsorship.mock.calls[1][0].operationId).toBe(first.operationId)
 await waitFor(()=>expect(screen.queryByRole('dialog')).toBeNull())
})
it('prevents unaffordable and invalid forms without sending a request',async()=>{
 render(<SponsorshipScreen owner="me" gold={100} service={api}/>)
 fireEvent.click(screen.getByRole('button',{name:'후원하기'}))
 expect(screen.getByRole('button',{name:'후원 열기'}).hasAttribute('disabled')).toBe(true)
 fireEvent.change(screen.getByLabelText('1인당 골드'),{target:{value:'1'}})
 fireEvent.change(screen.getByLabelText('받을 인원'),{target:{value:'101'}})
 expect(screen.getByRole('button',{name:'후원 열기'}).hasAttribute('disabled')).toBe(true)
 expect(api.createSponsorship).not.toHaveBeenCalled()
})
it('loads the full recipient list only when requested and supports owner cancellation before the first claim',async()=>{
 const mine={...post,mine:true,claimedCount:0,recipients:[]}
 api.loadSponsorships.mockResolvedValue({items:[mine],hasMore:false})
 api.cancelSponsorship.mockResolvedValue({...mine,status:'cancelled'})
 render(<SponsorshipScreen owner="donor" gold={10000} service={api}/>)
 fireEvent.click(await screen.findByRole('button',{name:'전체 보기'}))
 await waitFor(()=>expect(api.loadSponsorship).toHaveBeenCalledWith('post'))
 await screen.findByText('1번째 수령')
 fireEvent.click(within(screen.getByRole('dialog')).getByRole('button',{name:'Close'}))
 fireEvent.click(screen.getByRole('button',{name:'후원 취소'}))
 fireEvent.click(await screen.findByRole('button',{name:'취소하고 돌려받기'}))
 await screen.findByText('취소됨')
 expect(api.cancelSponsorship).toHaveBeenCalledExactlyOnceWith('post')
})
