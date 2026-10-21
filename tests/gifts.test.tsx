import { cleanup,fireEvent,render,screen,waitFor } from '@testing-library/react'
import { afterEach,beforeEach,expect,it,vi } from 'vitest'
import { SendGiftDialog } from '../src/features/gifts/send-gift-dialog'
import {markRelatedRead} from '@/features/notifications/api'
import { GiftDetailDialog } from '../src/features/gifts/gift-mailbox'
import type { Species,OwnedCollectible } from '../src/features/collection/api'

const mock=vi.hoisted(()=>({send:vi.fn(),load:vi.fn(),claim:vi.fn(),react:vi.fn(),refresh:vi.fn(),social:{owner:'me',requests:[{status:'accepted',sender_id:'me',recipient:{id:'friend',nickname:'친구',friend_code:'ABCDEF123456'}}],notifications:[]}}))
vi.mock('@/features/social/social-provider',()=>({useSocial:()=>({...mock.social,refresh:mock.refresh})}))
vi.mock('@/features/gold/gold-provider',()=>({useGold:()=>({refresh:mock.refresh}),GoldIcon:()=>null}))
vi.mock('@/features/notifications/api',()=>({markRelatedRead:vi.fn().mockResolvedValue(undefined)}))
vi.mock('@/features/collection/collectible-thumbnail',()=>({CollectibleThumbnail:({name,path}:{name:string;path:string})=><img alt={name} src={path}/>}))
vi.mock('@/features/gifts/api',async importOriginal=>({...await importOriginal<typeof import('../src/features/gifts/api')>(),sendGift:mock.send,loadGift:mock.load,claimGift:mock.claim,reactToGift:mock.react}))
const species={id:'fish',name:'멸치',kind:'fish',thumbnail_path:'fish.png'} as Species
const gift={id:'gift',sender_id:'friend',recipient_id:'me',sender_name:'친구',recipient_name:'나',species,quantity:1,message:'잘 키워줘!',status:'pending',reaction:null,created_at:'2026-10-15T00:00:00Z'}
beforeEach(()=>{vi.clearAllMocks();mock.refresh.mockResolvedValue(undefined);mock.load.mockResolvedValue(gift);mock.claim.mockResolvedValue({...gift,status:'claimed'});mock.react.mockResolvedValue({...gift,status:'claimed',reaction:'thumbs_up'})})
afterEach(cleanup)
it('keeps received and sent gift contents visible during notification refreshes',async()=>{
 const original=mock.social.notifications
 for(const sent of [false,true]){
  const record={...gift,...(sent?{sender_id:'me',recipient_id:'friend'}:{})}
  mock.load.mockResolvedValue(record)
  const view=render(<GiftDetailDialog id="gift" onClose={()=>{}}/>)
  await screen.findByText('잘 키워줘!')
  const image=screen.getByRole('img',{name:'멸치'})
  let finish!:(value:typeof record)=>void
  mock.load.mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve}))
  mock.social.notifications=[...original]
  view.rerender(<GiftDetailDialog id="gift" onClose={()=>{}}/>)
  await waitFor(()=>expect(finish).toBeTypeOf('function'))
  expect(screen.getByText('잘 키워줘!')).toBeTruthy()
  expect(screen.getByRole('img',{name:'멸치'})).toBe(image)
  expect(screen.queryByText('선물을 열어보는 중…')).toBeNull()
  finish(record)
  view.unmount()
 }
 mock.social.notifications=original
})
it('opens the gift sender without focusing the friend search input',async()=>{
 render(<SendGiftDialog species={species} items={[{id:'real',species}] as OwnedCollectible[]} disabled={false} onSent={()=>{}}/>)
 fireEvent.click(screen.getByRole('button',{name:'멸치 선물'}))
 const input=await screen.findByRole('textbox',{name:'친구 검색'})
 await new Promise(resolve=>setTimeout(resolve,0))
 expect(document.activeElement).not.toBe(input)
})
it('sends a real individual with a note and reuses the operation ID after a transport failure',async()=>{
 const onSent=vi.fn(),items=[{id:'real',species},{id:'test-demo',species}] as OwnedCollectible[]
 mock.send.mockRejectedValueOnce(new Error('connection lost')).mockResolvedValueOnce(gift)
 render(<SendGiftDialog species={species} items={items} disabled={false} onSent={onSent}/> )
 fireEvent.click(screen.getByRole('button',{name:'멸치 선물'}))
 fireEvent.click(await screen.findByRole('button',{name:'친구 선택'}))
 fireEvent.click(screen.getByRole('button',{name:'메모 추가'}))
 fireEvent.change(screen.getByLabelText(/메모/),{target:{value:'잘 키워줘!'}})
 fireEvent.click(screen.getByRole('button',{name:'선물 보내기'}))
 await screen.findByRole('alert')
 fireEvent.click(screen.getByRole('button',{name:'선물 보내기'}))
 await waitFor(()=>expect(onSent).toHaveBeenCalledWith(['real']))
 expect(mock.send.mock.calls[0].slice(0,3)).toEqual(['friend',['real'],'잘 키워줘!'])
 expect(mock.send.mock.calls[0][3]).toBe(mock.send.mock.calls[1][3])
})
it('shows the memo, claims the gift and sends a single emoji response',async()=>{
 render(<GiftDetailDialog id="gift" onClose={()=>{}}/> )
 expect(await screen.findByText('잘 키워줘!')).toBeTruthy()
 expect(screen.queryByRole('button',{name:'따봉 보내기'})).toBeNull()
 fireEvent.click(screen.getByRole('button',{name:'선물 받기'}))
 const reaction=await screen.findByRole('button',{name:'따봉 보내기'})
 fireEvent.click(reaction)
 await waitFor(()=>expect(mock.react).toHaveBeenCalledWith('gift','thumbs_up'))
 await waitFor(()=>expect(screen.queryByRole('button',{name:'따봉 보내기'})).toBeNull())
 expect(mock.claim).toHaveBeenCalledWith('gift')
})
it('claims exchange gold and refreshes the wallet without showing friend reactions',async()=>{
 const parcel={...gift,source:'exchange',reward_kind:'gold',quantity:300,species:{id:'gold',name:'골드',thumbnail_path:null}}
 mock.load.mockResolvedValue(parcel);mock.claim.mockResolvedValue({...parcel,status:'claimed'})
 render(<GiftDetailDialog id="gift" onClose={()=>{}}/>)
 await screen.findByText('거래소 배송')
 fireEvent.click(screen.getByRole('button',{name:'선물 받기'}))
 await waitFor(()=>expect(mock.claim).toHaveBeenCalledWith('gift'))
 await waitFor(()=>expect(mock.refresh).toHaveBeenCalled())
 expect(screen.queryByRole('button',{name:'따봉 보내기'})).toBeNull()
})
it('shows the actual sold item and quantity on a gold payment parcel',async()=>{
 const parcel={...gift,source:'exchange',reward_kind:'gold',quantity:10,species:{id:'gold',name:'골드',thumbnail_path:null,exchange_offer:{kind:'collectible',id:'fish',name:'멸치',quantity:2,thumbnail_path:'fish.png'}}}
 mock.load.mockResolvedValue(parcel);mock.claim.mockResolvedValue({...parcel,status:'claimed'})
 render(<GiftDetailDialog id="gift" onClose={()=>{}}/>)
 const image=await screen.findByRole('img',{name:'멸치'})
 expect(image.getAttribute('src')).toBe('fish.png')
 expect(screen.getByText('×2')).toBeTruthy()
 expect(screen.getByText('10')).toBeTruthy()
 expect(screen.queryByText('거래 물품')).toBeNull()
 fireEvent.click(screen.getByRole('button',{name:'선물 받기'}))
 await waitFor(()=>expect(screen.queryByRole('button',{name:'선물 받기'})).toBeNull())
 expect(screen.getByRole('img',{name:'멸치'})).toBeTruthy()
})

it('shows the operator welcome gold and hides friend replies after claiming',async()=>{
 const welcome={...gift,sender_id:null,sender_name:'퐁당섬 운영자',source:'system',reward_kind:'gold',species:{...species,name:'가입 축하 골드'},quantity:500,message:'퐁당섬에 오신 것을 환영해요!'};
 mock.load.mockResolvedValue(welcome);mock.claim.mockResolvedValue({...welcome,status:'claimed'});
 render(<GiftDetailDialog id="gift" onClose={()=>{}}/>);
 expect(await screen.findByText('500 골드')).toBeTruthy();
 expect(screen.getByRole('heading',{name:'모험 응원 선물'})).toBeTruthy();
 expect(screen.getByText('공식')).toBeTruthy();
 expect(screen.getByText('퐁당섬 운영팀에서 보내드렸어요')).toBeTruthy();
 fireEvent.click(screen.getByRole('button',{name:'선물 받기'}));
 await waitFor(()=>expect(screen.queryByRole('button',{name:'선물 받기'})).toBeNull());
 expect(mock.claim).toHaveBeenCalledWith('gift');
 expect(screen.queryByRole('button',{name:'따봉 보내기'})).toBeNull();
});

it('keeps a pending gift unread after opening and closing its detail',async()=>{
 const close=vi.fn()
 render(<GiftDetailDialog id="gift" onClose={close}/>)
 await screen.findByText('잘 키워줘!')
 expect(markRelatedRead).not.toHaveBeenCalled()
 fireEvent.click(screen.getByRole('button',{name:'Close'}))
 expect(close).toHaveBeenCalledOnce()
 expect(markRelatedRead).not.toHaveBeenCalled()
})

it('does not give an official badge to a matching player nickname',async()=>{
 mock.load.mockResolvedValue({...gift,sender_name:'퐁당섬 운영자',source:'friend'})
 render(<GiftDetailDialog id="gift" onClose={()=>{}}/>)
 await screen.findByText('잘 키워줘!')
 expect(screen.queryByText('공식')).toBeNull()
})
