import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react'
import {MemoryRouter} from 'react-router'
import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import {NotificationMenu} from '@/features/notifications/notification-menu'
import type {AppNotification} from '@/features/social/types'
const mock=vi.hoisted(()=>({opened:vi.fn(),refresh:vi.fn(),notifications:[] as AppNotification[],unread:{friend:1,general:0,notice:2,gift:0}}))
vi.mock('@/features/notifications/api',()=>({markRead:mock.opened}))
vi.mock('@/features/social/social-provider',()=>({useSocial:()=>({owner:'me',notifications:mock.notifications,unread:mock.unread,loading:false,error:null,refresh:mock.refresh})}))
beforeEach(()=>{vi.clearAllMocks();mock.notifications=[];mock.unread={friend:1,general:0,notice:2,gift:0};mock.opened.mockResolvedValue(undefined);mock.refresh.mockResolvedValue(undefined)})
afterEach(cleanup)
it('opens the originating board post from a comment notification',()=>{
 mock.notifications=[{id:'comment',category:'general',kind:'system',title:'내 글에 새 댓글이 달렸어요',board_post_id:'post',read_at:null,created_at:new Date().toISOString()} as AppNotification]
 render(<MemoryRouter><NotificationMenu/></MemoryRouter>)
 fireEvent.click(screen.getByRole('button',{name:'알림, 읽지 않은 알림 1개'}))
 expect(screen.getByRole('link',{name:/내 글에 새 댓글/}).getAttribute('href')).toBe('/board/post')
})
it('links a tailwind notification to expeditions with the dedicated artwork',()=>{
 mock.notifications=[{id:'boost',category:'general',kind:'system',title:'민지님이 순풍을 보내줬어요',expedition_boost_id:'help',read_at:null,created_at:new Date().toISOString()} as AppNotification]
 render(<MemoryRouter><NotificationMenu/></MemoryRouter>)
 fireEvent.click(screen.getByRole('button',{name:'알림, 읽지 않은 알림 1개'}))
 expect(screen.getByRole('link',{name:/민지님이 순풍/}).getAttribute('href')).toBe('/expeditions')
 expect(document.querySelector('img[src="/app-icons/fish-trap.png"]')).toBeTruthy()
})
it('marks only the clicked notification read',async()=>{
 mock.notifications=['first','second'].map(id=>({id,category:'general',kind:'system',title:id,read_at:null,created_at:new Date().toISOString()} as AppNotification))
 render(<MemoryRouter><NotificationMenu/></MemoryRouter>)
 fireEvent.click(screen.getByRole('button',{name:'알림, 읽지 않은 알림 1개'}))
 fireEvent.click(screen.getByRole('link',{name:/first/}))
 await waitFor(()=>expect(mock.opened).toHaveBeenCalledExactlyOnceWith('me','first'))
})
it('preserves gift arrival notifications when the drawer closes',async()=>{
 mock.notifications=[{id:'gift',category:'gift',kind:'gift_received',title:'선물 도착',read_at:null,created_at:new Date().toISOString()} as AppNotification]
 mock.unread.gift=1
 render(<MemoryRouter><NotificationMenu/></MemoryRouter>)
 fireEvent.click(screen.getByRole('button',{name:'알림, 읽지 않은 알림 2개'}))
 fireEvent.click(screen.getByRole('button',{name:'Close'}))
 expect(mock.opened).not.toHaveBeenCalled()
 expect(screen.getByRole('button',{name:'알림, 읽지 않은 알림 2개'})).toBeTruthy()
})
it('keeps new notifications unread until the drawer closes',async()=>{
 mock.notifications=[{id:'news',category:'general',kind:'system',title:'새 소식',read_at:null,created_at:new Date().toISOString()} as AppNotification]
 render(<MemoryRouter><NotificationMenu/></MemoryRouter>)
 expect(mock.opened).not.toHaveBeenCalled()
 fireEvent.click(screen.getByRole('button',{name:'알림, 읽지 않은 알림 1개'}))
 expect(mock.opened).not.toHaveBeenCalled()
 expect(document.querySelector('[data-unread="true"]')).toBeTruthy()
 fireEvent.click(screen.getByRole('button',{name:'Close'}))
 await waitFor(()=>expect(mock.opened).toHaveBeenCalledExactlyOnceWith('me','news'))
 await waitFor(()=>expect(mock.refresh).toHaveBeenCalledOnce())
 expect(screen.queryByRole('button',{name:/모두 읽음|읽음으로 표시/})).toBeNull()
})
it('filters by category without closing and updates unread counts after auto-read refresh',async()=>{
 mock.notifications=(['notice','friend','general','gift'] as const).map(category=>({id:category,recipient_id:'me',actor_id:null,category,kind:'system',title:`항목 ${category}`,body:'내용',request_id:null,request:null,read_at:null,created_at:new Date().toISOString()}))
 const view=render(<MemoryRouter><NotificationMenu/></MemoryRouter>)
 fireEvent.click(screen.getByRole('button',{name:'알림, 읽지 않은 알림 1개'}))
 await screen.findByRole('button',{name:'소셜, 미확인 1개'})
 expect(screen.getByRole('button',{name:'소셜, 미확인 1개'}).querySelector('span[aria-hidden="true"]')?.textContent).toBe('1')
 expect(screen.queryByRole('button',{name:/공지, 미확인/})).toBeNull()
 expect(screen.queryByText('항목 notice')).toBeNull()
 fireEvent.click(screen.getByRole('button',{name:'소셜, 미확인 1개'}))
 expect(screen.getByText('항목 friend')).toBeTruthy()
 mock.unread={notice:0,friend:0,general:0,gift:0};view.rerender(<MemoryRouter><NotificationMenu/></MemoryRouter>)
 expect(screen.getByRole('button',{name:'소셜, 미확인 0개'})).toBeTruthy()
 expect(screen.getByRole('button',{name:'소셜, 미확인 0개'}).querySelector('span[aria-hidden="true"]')?.textContent).toBe('0')
 expect(screen.getByRole('button',{name:'전체, 미확인 0개'})).toBeTruthy()
 for(const label of ['전체','소셜','소식','선물'])expect(screen.queryByText(label)).toBeNull()
 expect(screen.queryByText('열기 전 미확인 1개')).toBeNull()
 fireEvent.click(screen.getByRole('button',{name:'선물, 미확인 0개'}))
 expect(screen.getByText('항목 gift')).toBeTruthy();expect(screen.queryByText('항목 notice')).toBeNull()
 expect(mock.opened).not.toHaveBeenCalled()
})
it('keeps dedicated action icons visible after filtering the notification category',async()=>{
 mock.notifications=['친구가 어항을 닦아줬어요','친구가 먹이를 줬어요','어선이 귀항했어요!'].map((title,index)=>({id:String(index),recipient_id:'me',actor_id:null,category:'general',kind:'system',title,body:'내용',request_id:null,request:null,read_at:null,created_at:new Date().toISOString()}))
 render(<MemoryRouter><NotificationMenu/></MemoryRouter>)
 fireEvent.click(screen.getByRole('button',{name:'알림, 읽지 않은 알림 1개'}))
 fireEvent.click(await screen.findByRole('button',{name:'소식, 미확인 0개'}))
 for(const name of ['clean','feed','expedition'])expect(document.querySelector(`img[src="/notification-icons/${name}.png"]`)).toBeTruthy()
})

it('opens a separate notice drawer and marks only notices read',async()=>{
 mock.notifications=(['notice','friend'] as const).map(category=>({id:category,recipient_id:'me',actor_id:null,category,kind:'system',title:category,body:'내용',request_id:null,request:null,read_at:null,created_at:new Date().toISOString()}));
 render(<MemoryRouter><NotificationMenu noticeOnly/></MemoryRouter>);
 fireEvent.click(screen.getByRole('button',{name:'공지, 읽지 않은 공지 2개'}));
 expect(screen.getByRole('dialog',{name:'공지'})).toBeTruthy();
 expect(screen.getByText('notice')).toBeTruthy();expect(screen.queryByText('friend')).toBeNull();
 expect(screen.queryByRole('group',{name:'알림 종류'})).toBeNull();
 expect(mock.opened).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('button',{name:'Close'}));
 await waitFor(()=>expect(mock.opened).toHaveBeenCalledExactlyOnceWith('me','notice'));
 expect(document.querySelector('img[src="/app-icons/mail-notice.png"]')??document.querySelector('img[src*="notice"]')).toBeTruthy();
});

it('filters the notice drawer by the linked publication category',async()=>{
 mock.notifications=(['guide','update','maintenance','event'] as const).map(category=>({id:category,recipient_id:'me',actor_id:null,category:'notice',kind:'announcement',title:'공지 '+category,body:'내용',notice:{category},notice_id:category,request_id:null,request:null,read_at:null,created_at:new Date().toISOString()}));
 render(<MemoryRouter><NotificationMenu noticeOnly/></MemoryRouter>);
 fireEvent.click(screen.getByRole('button',{name:'공지, 읽지 않은 공지 2개'}));
 expect(screen.getByRole('group',{name:'공지 유형'})).toBeTruthy();
 for(const [label,key]of [['안내','guide'],['업데이트','update'],['버그 수정','maintenance'],['이벤트','event']]){
  expect(screen.getByRole('button',{name:label}).textContent).toContain(label);
  fireEvent.click(screen.getByRole('button',{name:label}));
  expect(screen.getByText('공지 '+key)).toBeTruthy();
  expect(screen.getAllByRole('link')).toHaveLength(1);
  expect(screen.getByRole('button',{name:label}).getAttribute('aria-pressed')).toBe('true');
 }
 fireEvent.click(screen.getByRole('button',{name:'전체'}));expect(screen.getAllByRole('link')).toHaveLength(4);
});
