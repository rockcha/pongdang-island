import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
import {AquariumPage} from '@/pages/aquarium-page'
import {MemoryRouter} from 'react-router'
import type {OwnedCollectible,Species} from '@/features/collection/api'
const mock=vi.hoisted(()=>({load:vi.fn(),place:vi.fn(),arrange:vi.fn(),items:[] as OwnedCollectible[]}))
const species:Species={id:'starfish',name:'불가사리',kind:'decoration',description:'',size:52,speed:0,swim_y_min:null,swim_y_max:null,rarity:'common',sprite_sheet_path:null,thumbnail_path:'starfish.png',sell_price:35}
vi.mock('@/features/gold/gold-provider',()=>({useGold:()=>({wallet:{gold:1000},transact:vi.fn(),busy:false,loading:false,error:null})}))
vi.mock('@/features/gold/api',()=>({goldError:()=>''}))
vi.mock('@/features/aquarium/api',()=>({loadAquarium:mock.load,placeCollectible:mock.place,arrangeDecoration:mock.arrange,manageTank:vi.fn(),moveCollectibles:vi.fn()}))
vi.mock('@/features/aquarium/aquarium-background-dialog',()=>({AquariumBackgroundDialog:()=>null}))
vi.mock('@/features/aquarium/collectible-storage-dialog',()=>({CollectibleStorageDialog:()=>null}))
vi.mock('@/components/confirm-dialog',()=>({ConfirmDialog:()=>null}))
vi.mock('@/features/collection/collection-dialog',()=>({CollectionDialog:({onAddTemporary}:{onAddTemporary?:(species:Species)=>void})=><button disabled={!onAddTemporary} onClick={()=>onAddTemporary?.(species)}>도감 넣기</button>}))
vi.mock('@/features/aquarium/aquarium-view',()=>({AquariumView:({items,storageControls,managementControls,onPlace,onArrange}:{items:OwnedCollectible[];storageControls:React.ReactNode;managementControls:React.ReactNode;onPlace:(id:string,x:number,y:number)=>void;onArrange:(id:string,value:object)=>Promise<void>})=>{
 mock.items=items
 return <>{storageControls}{managementControls}<span data-testid="count">{items.length}</span>{items[0]&&<button onClick={()=>{onPlace(items[0].id,.2,.3);void onArrange(items[0].id,{position_x:.2,position_y:.3,rotation:30,scale:1.5})}}>꾸미기</button>}</>
}}))
afterEach(()=>{cleanup();vi.clearAllMocks()})
it('keeps inserted individuals and edits only in memory and removes them after a fresh page mount',async()=>{
 mock.load.mockResolvedValue({tanks:[{id:'tank',name:'어항',background_id:'sea'}],inhabitants:[],catalog:[],owned:[],storageCount:0,tankCapacity:50,tankPrice:200})
 const view=render(<MemoryRouter><AquariumPage/></MemoryRouter>)
 await waitFor(()=>expect(screen.getByRole('button',{name:'도감 넣기'}).hasAttribute('disabled')).toBe(false))
 fireEvent.click(screen.getByRole('button',{name:'도감 넣기'}))
 fireEvent.click(screen.getByRole('button',{name:'도감 넣기'}))
 expect(mock.items).toHaveLength(2)
 expect(mock.items[0].id).not.toBe(mock.items[1].id)
 expect(mock.items[0]).toMatchObject({tank_id:'tank',species_id:'starfish',rotation:0,scale:1})
 fireEvent.click(screen.getByRole('button',{name:'꾸미기'}))
 expect(mock.items[0]).toMatchObject({position_x:.2,position_y:.3,rotation:30,scale:1.5})
 expect(mock.place).not.toHaveBeenCalled()
 expect(mock.arrange).not.toHaveBeenCalled()
 view.unmount();render(<MemoryRouter><AquariumPage/></MemoryRouter>)
 await waitFor(()=>expect(screen.getByRole('button',{name:'도감 넣기'}).hasAttribute('disabled')).toBe(false))
 expect(screen.getByTestId('count').textContent).toBe('0')
})
