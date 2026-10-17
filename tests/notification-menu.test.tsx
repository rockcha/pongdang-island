import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react'
import {MemoryRouter} from 'react-router'
import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import {NotificationMenu} from '@/features/notifications/notification-menu'
import type {AppNotification} from '@/features/social/types'
const mock=vi.hoisted(()=>({opened:vi.fn(),refresh:vi.fn(),notifications:[] as AppNotification[],unread:{friend:1,general:0,notice:2,gift:0}}))
vi.mock('@/features/notifications/api',()=>({notificationsOpened:mock.opened}))
vi.mock('@/features/social/social-provider',()=>({useSocial:()=>({notifications:mock.notifications,unread:mock.unread,loading:false,error:null,refresh:mock.refresh})}))
beforeEach(()=>{vi.clearAllMocks();mock.notifications=[];mock.unread={friend:1,general:0,notice:2,gift:0};mock.opened.mockResolvedValue(undefined);mock.refresh.mockResolvedValue(undefined)})
afterEach(cleanup)
it('automatically marks notifications read on opening, without doing so on initial render',async()=>{
 render(<MemoryRouter><NotificationMenu/></MemoryRouter>)
 expect(mock.opened).not.toHaveBeenCalled()
 fireEvent.click(screen.getByRole('button',{name:'알림, 읽지 않은 알림 3개'}))
 await waitFor(()=>expect(mock.opened).toHaveBeenCalledOnce())
 await waitFor(()=>expect(mock.refresh).toHaveBeenCalledOnce())
 expect(screen.queryByRole('button',{name:/모두 읽음|읽음으로 표시/})).toBeNull()
})
it('filters by category without closing and preserves the opening unread counts after auto-read refresh',async()=>{
 mock.notifications=(['notice','friend','general','gift'] as const).map(category=>({id:category,recipient_id:'me',actor_id:null,category,kind:'system',title:`항목 ${category}`,body:'내용',request_id:null,request:null,read_at:null,created_at:new Date().toISOString()}))
 const view=render(<MemoryRouter><NotificationMenu/></MemoryRouter>)
 fireEvent.click(screen.getByRole('button',{name:'알림, 읽지 않은 알림 3개'}))
 await screen.findByRole('menuitem',{name:'공지, 미확인 2개'})
 fireEvent.click(screen.getByRole('menuitem',{name:'공지, 미확인 2개'}))
 expect(screen.getByText('항목 notice')).toBeTruthy();expect(screen.queryByText('항목 friend')).toBeNull()
 mock.unread={notice:0,friend:0,general:0,gift:0};view.rerender(<MemoryRouter><NotificationMenu/></MemoryRouter>)
 expect(screen.getByRole('menuitem',{name:'공지, 미확인 2개'})).toBeTruthy()
 expect(screen.getByText('열기 전 미확인 3개')).toBeTruthy()
 fireEvent.click(screen.getByRole('menuitem',{name:'선물, 미확인 0개'}))
 expect(screen.getByText('항목 gift')).toBeTruthy();expect(screen.queryByText('항목 notice')).toBeNull()
 expect(mock.opened).toHaveBeenCalledOnce()
})
