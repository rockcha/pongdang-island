import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router'
import { FriendAquariumPage } from '@/features/friends/friend-aquarium-page'
import type {ReactNode} from 'react'
const mock=vi.hoisted(()=>({world:undefined as undefined|{columns:number;initialView?:number;preserveArrangement?:boolean;onViewChange?:(view:number)=>void},items:[] as {id:string;interaction_locked?:boolean;position_x?:number}[]}))
vi.mock('@/features/friends/aquarium-api', () => ({
  loadFriendAquarium: async () => ({
    owner: { id: 'friend', nickname: '친구퐁이', avatar_path: null },
    tanks: [
      { id: 'one', name: '첫 어항', background_id: 'default' },
      { id: 'two', name: '두 번째 어항', background_id: 'default' },
    ],
    inhabitants: [{id:'one-fish',tank_id:'one',position_x:.25}],
    backgrounds: [{id:'default',name:'맑은 물빛',image_path:'default.png'}],
  }),
  visitError: () => '오류',
}))
vi.mock('@/features/aquarium/tank-inhabitants', () => ({
  TankInhabitants: ({items,world,scenery,preview}:{items:typeof mock.items;world:typeof mock.world;scenery:ReactNode;preview?:boolean}) => {if(preview)return <span data-testid="friend-preview"/>;mock.items=items;mock.world=world;return <div data-testid="inhabitants">{scenery}<button onClick={()=>world?.onViewChange?.(.637)}>친구 어항 화면 이동</button></div>},
}))
vi.mock('@/features/aquarium/aquarium-backdrop',()=>({AquariumBackdrop:({panorama}:{panorama?:{src:string;view:number}})=><div data-testid="friend-backdrop" data-view={panorama?.view} data-src={panorama?.src}/>}))
vi.mock('@/features/friends/aquarium-care', () => ({
  AquariumCare: ({ tank }: { tank: string }) => <div>돌보기 {tank}</div>,
}))
afterEach(cleanup)
it('shows the owner and browses friend tanks without a collectible list', async () => {
  render(
    <MemoryRouter initialEntries={['/friends/friend/aquarium']}>
      <Routes>
        <Route path="/friends/:ownerId/aquarium" element={<FriendAquariumPage />} />
      </Routes>
    </MemoryRouter>,
  )
  const first=await screen.findByRole('button',{name:'첫 어항 어항 열기'})
  const list=screen.getByLabelText('친구 어항 목록')
  list.scrollTop=140;fireEvent.scroll(list)
  expect(screen.getAllByTestId('friend-preview')).toHaveLength(2)
  expect(screen.queryByRole('button',{name:/어항 추가하기/})).toBeNull()
  expect(screen.queryByRole('button',{name:/이름 수정/})).toBeNull()
  expect(screen.queryByText(/개의 작은 바다/)).toBeNull()
  expect(screen.queryByText('돌보기 one')).toBeNull()
  fireEvent.click(first)
  expect(mock.world).toMatchObject({columns:3,overview:true,initialZoom:1,initialView:1,preserveArrangement:false})
  expect(mock.items).toEqual([expect.objectContaining({id:'one-fish',interaction_locked:true,position_x:.25})])
  expect(screen.getByTestId('friend-backdrop').dataset.src).toContain('default-panorama-v2.png')
  fireEvent.click(screen.getByRole('button',{name:'친구 어항 화면 이동'}))
  expect(screen.getByTestId('friend-backdrop').dataset.view).toBe('0.637')
  expect(mock.items[0].position_x).toBe(.25)
  const tank = screen.getByLabelText('첫 어항')
  expect(tank.className).toContain('w-full')
  expect(tank.className).toContain('shrink-0')
  expect(tank.className).toContain('min-h-0')
  expect(screen.getByRole('link', { name: '친구퐁이' }).parentElement?.className).toContain('h-14')
  expect(screen.getByRole('link', { name: '내 어항' }).getAttribute('href')).toBe('/aquarium')
  expect(screen.getByRole('button', { name: '친구 어항' })).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: '다음 어항' }))
  expect(screen.getByLabelText('두 번째 어항')).toBeTruthy()
  expect(screen.getByTestId('friend-backdrop').dataset.view).toBe('1')
  expect(screen.getByText('돌보기 two')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: '다음 어항' }))
  expect(screen.getByLabelText('첫 어항')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: '이전 어항' }))
  expect(screen.getByLabelText('두 번째 어항')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: '이전 어항' }))
  expect(screen.queryByRole('button', { name: '개체 목록' })).toBeNull()
  expect(screen.queryByRole('dialog')).toBeNull()
  fireEvent.click(screen.getByRole('button',{name:'친구 어항 목록'}))
  expect(screen.getByLabelText('친구 어항 목록').scrollTop).toBe(140)
  expect(screen.getAllByTestId('friend-preview')).toHaveLength(2)
})
