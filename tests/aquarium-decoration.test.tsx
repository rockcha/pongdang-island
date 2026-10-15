import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
import {AquariumView} from '../src/features/aquarium/aquarium-view'
import type {OwnedCollectible} from '../src/features/collection/api'

const mock=vi.hoisted(()=>({items:[] as unknown[]}))
vi.mock('../src/features/aquarium/tank-inhabitants',()=>({TankInhabitants:({items,onSelectDecoration,onBackgroundTap}:{items:OwnedCollectible[];onSelectDecoration:(id:string)=>void;onBackgroundTap:()=>void})=>{mock.items=items;return <><button onClick={()=>onSelectDecoration(items[0].id)}>수조 장식물 클릭</button><button onClick={onBackgroundTap}>수조 배경 클릭</button></>}}))
vi.mock('../src/features/aquarium/aquarium-inventory-dialog',()=>({AquariumInventoryDialog:()=>null}))
vi.mock('../src/features/aquarium/api',()=>({backgroundUrl:(path:string)=>path}))
const decoration:OwnedCollectible={id:'starfish',species_id:'starfish',tank_id:'tank',animation_seed:0,position_x:.2,position_y:.3,rotation:45,scale:.5,acquired_at:'',species:{id:'starfish',kind:'decoration',name:'살구 불가사리',description:'유지할 설명',swim_y_min:null,swim_y_max:null,speed:0,size:52,rarity:'common',sprite_sheet_path:null,thumbnail_path:'decorations/normal/apricot-starfish_thumbnail.png',sell_price:35}}
afterEach(cleanup)
it('shows the tank counter and a single purchase button without arrow buttons, and supports keyboard navigation',()=>{
 const buy=vi.fn(),navigate=vi.fn()
 render(<AquariumView name="내 어항" items={[]} busy={false} onPlace={()=>{}} onSell={async()=>{}} navigation={{index:0,count:2,onChange:navigate}} purchase={{price:200,disabled:false,onBuy:buy}}/>)
 expect(screen.getByLabelText('현재 어항').textContent).toBe('1/2')
 expect(screen.queryByRole('button',{name:'이전 어항'})).toBeNull()
 expect(screen.queryByRole('button',{name:'다음 어항'})).toBeNull()
 fireEvent.click(screen.getByRole('button',{name:'어항 구매 200 골드'}))
 expect(buy).toHaveBeenCalledOnce()
 fireEvent.keyDown(screen.getByTestId('aquarium-glass'),{key:'ArrowRight'})
 expect(navigate).toHaveBeenCalledWith('next')
})
it('auto-saves edits and dismisses the toolbar on background tap without cancelling the save',async()=>{
 let finish!:()=>void
 const arrange=vi.fn(()=>new Promise<void>(resolve=>{finish=resolve}))
 render(<AquariumView name="내 어항" items={[decoration]} busy={false} onPlace={()=>{}} onArrange={arrange} onSell={async()=>{}}/>)
 fireEvent.click(screen.getByRole('button',{name:'수조 장식물 클릭'}))
 fireEvent.click(screen.getByRole('button',{name:'크기 키우기'}))
 expect(mock.items[0]).toMatchObject({scale:.6})
 expect(arrange).toHaveBeenCalledWith('starfish',{position_x:.2,position_y:.3,rotation:45,scale:.6})
 fireEvent.click(screen.getByRole('button',{name:'수조 배경 클릭'}))
 expect(screen.queryByRole('region',{name:'살구 불가사리 꾸미기'})).toBeNull()
 finish()
 await waitFor(()=>expect(arrange).toHaveBeenCalledOnce())
})
it('restores the last position and size when automatic saving fails',async()=>{
 const arrange=vi.fn(async()=>{throw new Error('offline')})
 render(<AquariumView name="내 어항" items={[decoration]} busy={false} onPlace={()=>{}} onArrange={arrange} onSell={async()=>{}}/>)
 fireEvent.click(screen.getByRole('button',{name:'수조 장식물 클릭'}))
 fireEvent.click(screen.getByRole('button',{name:'크기 키우기'}))
 await waitFor(()=>expect(mock.items[0]).toMatchObject({scale:.5}))
})
