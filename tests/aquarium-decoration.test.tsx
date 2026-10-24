import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { AquariumView } from '../src/features/aquarium/aquarium-view'
import type { OwnedCollectible } from '../src/features/collection/api'
vi.mock('../src/features/friends/friend-aquarium-picker', () => ({ FriendAquariumPicker: () => <button>친구 어항</button> }))

const mock = vi.hoisted(() => ({ items: [] as unknown[],world:undefined as undefined|{columns:number;preserveArrangement?:boolean},position:undefined as undefined|((id:string,x:number,y:number)=>void) }))
vi.mock('../src/features/aquarium/tank-inhabitants', () => ({
  TankInhabitants: ({
    items,
    onSelectDecoration,
    onBackgroundTap,
    onSelectionPosition,
    world,
  }: {
    items: OwnedCollectible[]
    onSelectDecoration: (id: string) => void
    onBackgroundTap: () => void
    onSelectionPosition?: (id:string,x:number,y:number)=>void
    world?: {columns:number;preserveArrangement?:boolean}
  }) => {
    mock.items = items
    mock.world = world
    mock.position = onSelectionPosition
    return (
      <>
        <button onClick={() => onSelectDecoration(items[0].id)}>수조 장식물 클릭</button>
        <button onClick={onBackgroundTap}>수조 배경 클릭</button>
      </>
    )
  },
}))
vi.mock('../src/features/aquarium/aquarium-inventory-dialog', () => ({
  AquariumInventoryDialog: () => null,
}))
vi.mock('../src/features/aquarium/api', () => ({ backgroundUrl: (path: string) => path, storageError: () => '이동하지 못했어요.' }))
vi.mock('../src/features/collection/collectible-thumbnail', () => ({ CollectibleThumbnail: () => null }))
const decoration: OwnedCollectible = {
  id: 'starfish',
  species_id: 'starfish',
  tank_id: 'tank',
  animation_seed: 0,
  position_x: 0.2,
  position_y: 0.3,
  rotation: 45,
  scale: 0.5,
  acquired_at: '',
  species: {
    id: 'starfish',
    kind: 'decoration',
    name: '살구 불가사리',
    description: '유지할 설명',
    swim_y_min: null,
    swim_y_max: null,
    speed: 0,
    size: 52,
    rarity: 'common',
    sprite_sheet_path: null,
    thumbnail_path: 'decorations/normal/apricot-starfish_thumbnail.png',
    sell_price: 35,
  },
}
afterEach(cleanup)
it('enables three panes for registered local themes and keeps the original decoration payload',()=>{
 const arrange=vi.fn(async()=>{})
 const view=render(<AquariumView name="어항" items={[decoration]} background={{name:'맑은 물빛',image_path:'default.png'}} busy={false} onPlace={()=>{}} onArrange={arrange} onSell={async()=>{}}/>)
 expect(mock.world).toMatchObject({columns:3,preserveArrangement:false})
 expect(screen.getByRole('button',{name:'어항 왼쪽으로 조금 이동'})).toBeTruthy()
 fireEvent.click(screen.getByRole('button',{name:'수조 장식물 클릭'}))
 expect(screen.getByRole('button',{name:'어항 왼쪽으로 조금 이동'})).toBeTruthy()
 expect(mock.items[0]).toMatchObject({position_x:decoration.position_x,position_y:decoration.position_y,rotation:decoration.rotation,scale:decoration.scale})
 view.rerender(<AquariumView name="어항" items={[decoration]} background={{name:'산호 정원',image_path:'coral.png'}} busy={false} onPlace={()=>{}} onArrange={arrange} onSell={async()=>{}}/>)
 expect(mock.world).toMatchObject({columns:3,preserveArrangement:false})
 view.rerender(<AquariumView name="어항" items={[decoration]} background={{name:'사용자 테마',image_path:'custom.png'}} busy={false} onPlace={()=>{}} onArrange={arrange} onSell={async()=>{}}/>)
 expect(mock.world).toBeUndefined()
 expect(arrange).not.toHaveBeenCalled()
})
it('moves the selected individual to another tank and blocks full tanks', async () => {
 const move = vi.fn(async () => {})
 render(<AquariumView name="어항" items={[decoration]} busy={false} onPlace={() => {}} onArrange={async () => {}} onSell={async () => {}} onMove={move} tanks={[{id:'other',name:'빈 어항'}, {id:'full',name:'가득 찬 어항'}] as never} inhabitants={[{...decoration,tank_id:'full'}]} tankCapacity={1}/>)
 fireEvent.click(screen.getByRole('button',{name:'수조 장식물 클릭'}))
 fireEvent.click(screen.getByRole('button',{name:'이동'}))
 expect(screen.getByRole('button',{name:/가득 찬 어항/})).toHaveProperty('disabled',true)
 fireEvent.click(screen.getByRole('button',{name:/빈 어항/}))
 await waitFor(() => expect(move).toHaveBeenCalledWith(['starfish'],'other'))
 await waitFor(() => expect(screen.queryByRole('button',{name:'정보 보기'})).toBeNull())
})
it('stores a selected individual and keeps failed operations available to retry', async () => {
 const store = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(undefined)
 render(<AquariumView name="어항" items={[decoration]} busy={false} onPlace={() => {}} onArrange={async () => {}} onSell={async () => {}} onStore={store}/>)
 fireEvent.click(screen.getByRole('button',{name:'수조 장식물 클릭'}))
 fireEvent.click(screen.getByRole('button',{name:'보관함'}))
 await screen.findByRole('alert')
 fireEvent.click(screen.getByRole('button',{name:'보관함'}))
 await waitFor(() => expect(store).toHaveBeenCalledTimes(2))
 expect(store).toHaveBeenLastCalledWith(['starfish'])
})
it('requires confirmation before selling the clicked individual', async () => {
 const sell = vi.fn(async () => {})
 render(<AquariumView name="어항" items={[decoration]} busy={false} onPlace={() => {}} onArrange={async () => {}} onSell={sell}/>)
 fireEvent.click(screen.getByRole('button',{name:'수조 장식물 클릭'}))
 fireEvent.click(screen.getByRole('button',{name:'판매 35 골드'}))
 expect(sell).not.toHaveBeenCalled()
 fireEvent.click(screen.getByRole('button',{name:'판매하기'}))
 await waitFor(() => expect(sell).toHaveBeenCalledWith(['starfish']))
})
it('resizes a swimming fish between half and double size without freezing or moving it and rolls back failed saves',async()=>{
 const fish={...decoration,id:'fish',scale:.5,species:{...decoration.species,kind:'fish' as const,movement_type:'swim' as const,speed:.05}}
 const arrange=vi.fn(async()=>{})
 render(<AquariumView name="어항" items={[fish]} busy={false} onPlace={()=>{}} onArrange={arrange} onSell={async()=>{}}/>)
 fireEvent.click(screen.getByRole('button',{name:'수조 장식물 클릭'}))
 expect(screen.getByRole('button',{name:'물고기 크기 줄이기'}).hasAttribute('disabled')).toBe(true)
 fireEvent.click(screen.getByRole('button',{name:'물고기 크기 키우기'}))
 await waitFor(()=>expect(arrange).toHaveBeenCalledWith('fish',expect.objectContaining({scale:.6})))
 expect(mock.items[0]).toMatchObject({scale:.6,position_x:.2,position_y:.3})
 expect((mock.items[0] as OwnedCollectible&{editing?:boolean}).editing).not.toBe(true)
 await waitFor(()=>expect(screen.getByRole('button',{name:'물고기 크기 키우기'}).hasAttribute('disabled')).toBe(false))
 arrange.mockRejectedValueOnce(new Error('offline'))
 fireEvent.click(screen.getByRole('button',{name:'물고기 크기 키우기'}))
 await waitFor(()=>expect(screen.getByLabelText('현재 크기').textContent).toBe('0.6×'))
})
it('keeps fish info near the initial selection without following subsequent swim positions',()=>{
 const fish={...decoration,id:'fish',species:{...decoration.species,kind:'fish' as const,movement_type:'swim' as const,speed:.05}}
 render(<AquariumView name="어항" items={[fish]} busy={false} onPlace={()=>{}} onArrange={async()=>{}} onSell={async()=>{}}/>)
 fireEvent.click(screen.getByRole('button',{name:'수조 장식물 클릭'}))
 const toolbar=screen.getByRole('button',{name:'정보 보기'}).parentElement!.parentElement!
 const glass=screen.getByTestId('aquarium-glass')
 Object.defineProperties(glass,{clientWidth:{value:320},clientHeight:{value:560}})
 mock.position?.('fish',150,250)
 expect(toolbar.style.getPropertyValue('--toolbar-x')).toBe('158px')
 expect(toolbar.style.getPropertyValue('--toolbar-y')).toBe('244px')
 mock.position?.('fish',220,400)
 expect(toolbar.style.getPropertyValue('--toolbar-x')).toBe('158px')
 expect(toolbar.style.getPropertyValue('--toolbar-y')).toBe('244px')
 fireEvent.click(screen.getByRole('button',{name:'수조 장식물 클릭'}))
 mock.position?.('fish',220,400)
 expect(toolbar.style.getPropertyValue('--toolbar-x')).toBe('162px')
 expect(toolbar.style.getPropertyValue('--toolbar-y')).toBe('394px')
})
it('shows trash transform controls and saves the position lock from its toolbar',async()=>{
 const trash={...decoration,id:'bottle',species:{...decoration.species,kind:'trash' as const,movement_type:'swim' as const,speed:.03}},arrange=vi.fn(async()=>{})
 render(<AquariumView name="어항" items={[trash]} busy={false} onPlace={()=>{}} onArrange={arrange} onSell={async()=>{}}/>)
 fireEvent.click(screen.getByRole('button',{name:'수조 장식물 클릭'}))
 expect(screen.getByRole('button',{name:'정보 보기'})).toBeTruthy()
 expect(screen.getByRole('button',{name:'시계 방향 15도 회전'})).toBeTruthy()
 expect(screen.getByRole('button',{name:'크기 키우기'})).toBeTruthy()
 fireEvent.click(screen.getByRole('button',{name:'위치 고정'}))
 await waitFor(()=>expect(arrange).toHaveBeenCalledWith('bottle',expect.objectContaining({position_locked:true,rotation:45,scale:.5})))
 expect(await screen.findByRole('button',{name:'위치 고정 해제'})).toBeTruthy()
})
it('allows circular navigation with arrows and keyboard at both ends', () => {
  const buy = vi.fn(),
    navigate = vi.fn()
  const { rerender } = render(
    <AquariumView
      name="내 어항"
      items={[]}
      busy={false}
      onPlace={() => {}}
      onSell={async () => {}}
      navigation={{ index: 0, count: 2, onChange: navigate }}
      purchase={{ price: 200, disabled: false, onBuy: buy }}
    />,
  )
  expect(screen.getByLabelText('현재 어항').textContent?.replace(/\s/g, '')).toBe('1/2')
  expect(screen.getByRole('button', { name: '이전 어항' }).hasAttribute('disabled')).toBe(false)
  fireEvent.click(screen.getByRole('button', { name: '이전 어항' }))
  expect(navigate).toHaveBeenLastCalledWith('previous')
  fireEvent.click(screen.getByRole('button', { name: '다음 어항' }))
  expect(navigate).toHaveBeenCalledWith('next')
  expect(screen.queryByRole('button', { name: '어항 추가' })).toBeNull()
  expect(screen.getByRole('button', { name: '친구 어항' })).toBeTruthy()
  expect(screen.getByRole('button', { name: '어항 관리' })).toBeTruthy()
  fireEvent.keyDown(screen.getByTestId('aquarium-glass'), { key: 'ArrowRight' })
  expect(navigate).toHaveBeenCalledWith('next')
  rerender(
    <AquariumView
      name="두 번째 어항"
      items={[]}
      busy={false}
      onPlace={() => {}}
      onSell={async () => {}}
      navigation={{ index: 1, count: 2, onChange: navigate }}
    />,
  )
  expect(screen.getByRole('button', { name: '다음 어항' }).hasAttribute('disabled')).toBe(false)
  fireEvent.click(screen.getByRole('button', { name: '다음 어항' }))
  expect(navigate).toHaveBeenLastCalledWith('next')
  fireEvent.click(screen.getByRole('button', { name: '이전 어항' }))
  expect(navigate).toHaveBeenLastCalledWith('previous')
})
it('auto-saves edits and dismisses the toolbar on background tap without cancelling the save', async () => {
  let finish!: () => void
  const arrange = vi.fn(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve
      }),
  )
  render(
    <AquariumView
      name="내 어항"
      items={[decoration]}
      busy={false}
      onPlace={() => {}}
      onArrange={arrange}
      onSell={async () => {}}
    />,
  )
  fireEvent.click(screen.getByRole('button', { name: '수조 장식물 클릭' }))
  fireEvent.click(screen.getByRole('button', { name: '크기 키우기' }))
  expect(mock.items[0]).toMatchObject({ scale: 0.6 })
  expect(arrange).toHaveBeenCalledWith(
    'starfish',
    expect.objectContaining({ rotation: 45, scale: 0.6, flipped: false }),
  )
  fireEvent.click(screen.getByRole('button', { name: '수조 배경 클릭' }))
  expect(screen.queryByRole('region', { name: '살구 불가사리 꾸미기' })).toBeNull()
  finish()
  await waitFor(() => expect(arrange).toHaveBeenCalledOnce())
})
it('restores the last position and size when automatic saving fails', async () => {
  const arrange = vi.fn(async () => {
    throw new Error('offline')
  })
  render(
    <AquariumView
      name="내 어항"
      items={[decoration]}
      busy={false}
      onPlace={() => {}}
      onArrange={arrange}
      onSell={async () => {}}
    />,
  )
  fireEvent.click(screen.getByRole('button', { name: '수조 장식물 클릭' }))
  fireEvent.click(screen.getByRole('button', { name: '크기 키우기' }))
  await waitFor(() => expect(mock.items[0]).toMatchObject({ scale: 0.5 }))
})

it('preserves the center and toolbar anchor while scaling', async () => {
  const arrange = vi.fn(async () => {})
  render(
    <AquariumView
      name="어항"
      items={[decoration]}
      busy={false}
      onPlace={() => {}}
      onArrange={arrange}
      onSell={async () => {}}
    />,
  )
  fireEvent.click(screen.getByRole('button', { name: '수조 장식물 클릭' }))
  const toolbar = screen.getByRole('region', { name: '살구 불가사리 꾸미기' }).parentElement!
  const before = toolbar.getAttribute('style')
  fireEvent.click(screen.getByRole('button', { name: '크기 키우기' }))
  await waitFor(() => expect(arrange).toHaveBeenCalledOnce())
  expect(toolbar.getAttribute('style')).toBe(before)
  const next = arrange.mock.calls[0] as unknown as [
    string,
    { position_x: number; position_y: number; scale: number },
  ]
  const factor = Math.SQRT2,
    oldSize = 26,
    newSize = 31.2
  expect(next[1].position_x * (320 - newSize * factor) + (newSize * factor) / 2).toBeCloseTo(
    0.2 * (320 - oldSize * factor) + (oldSize * factor) / 2,
  )
  expect(next[1].position_y * (560 - newSize * factor) + (newSize * factor) / 2).toBeCloseTo(
    0.3 * (560 - oldSize * factor) + (oldSize * factor) / 2,
  )
})
