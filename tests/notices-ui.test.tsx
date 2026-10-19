import {cleanup,fireEvent,render,screen,waitFor,within} from '@testing-library/react'
import {MemoryRouter,Route,Routes} from 'react-router'
import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import {NoticePage,NoticeDetail} from '@/features/notices/notice-page'
import {NoticeEditor} from '@/features/notices/notice-editor'
import {NoticeBody} from '@/features/notices/notice-body'
const mock=vi.hoisted(()=>({operator:vi.fn(),feed:vi.fn(),detail:vi.fn(),save:vi.fn(),upload:vi.fn(),remove:vi.fn(),read:vi.fn(),refresh:vi.fn()}))
vi.mock('@/features/social/social-provider',()=>({useSocial:()=>({owner:'me',refresh:mock.refresh})}))
vi.mock('@/features/notifications/api',()=>({markRelatedRead:mock.read}))
vi.mock('@/features/notices/api',async original=>({...await original<typeof import('@/features/notices/api')>(),isNoticeOperator:mock.operator,loadNotices:mock.feed,loadNotice:mock.detail,saveNotice:mock.save,uploadNoticeImage:mock.upload,deleteNotice:mock.remove}))
const notice={id:'notice',category:'update' as const,title:'푸른골 업데이트',body:'새 해역이 열렸어요.',images:[],urls:{},status:'published' as const,pinned:true,starts_at:null,ends_at:null,author_id:null,created_at:'2026-10-17T00:00:00Z',updated_at:'2026-10-17T00:00:00Z',published_at:'2026-10-17T00:00:00Z',revision:1}
beforeEach(()=>{vi.clearAllMocks();mock.operator.mockResolvedValue(false);mock.feed.mockResolvedValue({items:[notice],total:1});mock.detail.mockResolvedValue(notice);mock.save.mockResolvedValue(notice);mock.upload.mockResolvedValue({path:'image.png',url:'/image.png'});mock.remove.mockResolvedValue(undefined);mock.read.mockResolvedValue(undefined);mock.refresh.mockResolvedValue(undefined)})
afterEach(cleanup)
it('keeps the category title and date outside the scrolling body and separates attachments',async()=>{
 mock.detail.mockResolvedValue({...notice,images:['picture.png'],urls:{'picture.png':'/picture.png'}})
 const {container}=render(<MemoryRouter initialEntries={['/square/notices/notice']}><Routes><Route path="/square/notices/:noticeId" element={<NoticeDetail/>}/></Routes></MemoryRouter>)
 await screen.findByRole('heading',{name:notice.title})
 const header=container.querySelector('[data-notice-header]')!,body=container.querySelector('[data-notice-body]')!
 expect(within(header as HTMLElement).getByText('업데이트')).toBeTruthy()
 expect(header.querySelector('time')).toBeTruthy()
 expect(body.contains(header)).toBe(false)
 expect(screen.queryByText(/운영팀/)).toBeNull()
 expect(screen.queryByRole('button',{name:'목록'})).toBeNull()
 expect(screen.getByRole('img',{name:/첨부 이미지 1/}).closest('figure')).toBeTruthy()
 expect(screen.getByText('첨부 이미지 1')).toBeTruthy()
})
it('marks the original notice read and lets an operator delete only after confirmation',async()=>{
 mock.operator.mockResolvedValue(true)
 render(<MemoryRouter initialEntries={['/square/notices/notice']}><Routes><Route path="/square/notices/:noticeId" element={<NoticeDetail/>}/><Route path="/square/notices" element={<p>공지 목록으로 이동</p>}/></Routes></MemoryRouter>)
 fireEvent.click(await screen.findByRole('button',{name:'공지 관리'}))
 fireEvent.click(await screen.findByRole('menuitem',{name:'삭제'}))
 await waitFor(()=>expect(mock.read).toHaveBeenCalledWith('me','notice_id','notice'))
 expect(mock.remove).not.toHaveBeenCalled()
 fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button',{name:'확인'}))
 await waitFor(()=>expect(mock.remove).toHaveBeenCalledWith('notice',1))
 expect(await screen.findByText('공지 목록으로 이동')).toBeTruthy()
})
it('shows minimal notice rows and filters while hiding author tools from ordinary readers',async()=>{
 render(<MemoryRouter><NoticePage/></MemoryRouter>)
 expect(await screen.findByRole('heading',{name:notice.title})).toBeTruthy()
 const row=screen.getByRole('link',{name:/푸른골 업데이트/})
 expect(row.querySelector('img')?.getAttribute('src')).toBe('/app-icons/notice-update.png')
 expect(screen.queryByRole('textbox',{name:'공지 검색'})).toBeNull()
 expect(screen.queryByRole('link',{name:/공지 작성/})).toBeNull()
 fireEvent.click(screen.getByRole('button',{name:'버그 수정'}))
 await waitFor(()=>expect(mock.feed).toHaveBeenLastCalledWith('maintenance','',0,false))
})
it('blocks editor access without an operator role',async()=>{
 render(<MemoryRouter><NoticeEditor/></MemoryRouter>)
 expect(await screen.findByRole('alert')).toHaveProperty('textContent','공지 작성 권한이 없어요.')
 expect(screen.queryByLabelText('공지 제목')).toBeNull()
})
it('uploads images, inserts them into the body, previews and confirms publishing',async()=>{
 mock.operator.mockResolvedValue(true)
 render(<MemoryRouter initialEntries={['/square/notices/new']}><Routes><Route path="/square/notices/new" element={<NoticeEditor/>}/><Route path="/square/notices/:noticeId" element={<p>게시 완료 화면</p>}/></Routes></MemoryRouter>)
 fireEvent.change(await screen.findByLabelText('공지 제목'),{target:{value:'새 소식'}})
 fireEvent.change(screen.getByLabelText('공지 본문'),{target:{value:'안녕하세요'}})
 fireEvent.change(screen.getByLabelText('공지 이미지 첨부'),{target:{files:[new File(['image'],'test.png',{type:'image/png'})]}})
 fireEvent.click(await screen.findByRole('button',{name:'본문에 넣기'}))
 fireEvent.click(screen.getByRole('button',{name:'미리보기'}))
 expect(await screen.findByRole('img',{name:/새 소식 첨부 이미지/})).toBeTruthy()
 fireEvent.click(screen.getByRole('button',{name:'게시하기'}))
 expect(mock.save).not.toHaveBeenCalled()
 fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button',{name:'확인'}))
 await waitFor(()=>expect(mock.save).toHaveBeenCalledWith(expect.objectContaining({title:'새 소식',images:['image.png'],body:'안녕하세요\n![이미지](image.png)\n',revision:0}),'published'))
 expect(await screen.findByText('게시 완료 화면')).toBeTruthy()
})
it('renders user text without executing HTML or unsafe links',()=>{
 const view=render(<NoticeBody notice={{...notice,body:'<script>alert(1)</script>\n[위험](javascript:alert)\n**강조**\n[안내](https://example.com)'}}/>)
 expect(view.container.querySelector('script')).toBeNull()
 expect(view.container.querySelector('strong')?.textContent).toBe('강조')
 expect(screen.getByRole('link',{name:'안내'}).getAttribute('href')).toBe('https://example.com')
 expect(screen.queryByRole('link',{name:'위험'})).toBeNull()
})
