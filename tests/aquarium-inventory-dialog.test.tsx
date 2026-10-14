import { cleanup,fireEvent,render,screen,waitFor } from '@testing-library/react'
import { afterEach,expect,it,vi } from 'vitest'
import { AquariumInventoryDialog } from '../src/features/aquarium/aquarium-inventory-dialog'
import type { OwnedCollectible,CollectibleKind } from '../src/features/collection/api'

vi.mock('@/features/collection/collectible-thumbnail',()=>({CollectibleThumbnail:({name}:{name:string})=><span>{name} 이미지</span>}))
afterEach(cleanup)
function item(id:string,speciesId:string,name:string,kind:CollectibleKind='fish',rarity='common'):OwnedCollectible{
 return {id,species_id:speciesId,species:{id:speciesId,name,kind,rarity,sell_price:40,thumbnail_path:'fish.png'}} as OwnedCollectible
}
const items=[item('a','anchovy','멸치'),item('b','anchovy','멸치'),item('test-c','anchovy','멸치'),item('d','shark','상어','fish','rare'),item('e','bottle','유리병','trash')]
it('groups species, combines filters and sells only real individuals with the selected quantity',async()=>{
 const onSell=vi.fn(async()=>{})
 render(<AquariumInventoryDialog name="내 어항" items={items} busy={false} onSell={onSell}/> )
 fireEvent.click(screen.getByRole('button',{name:'개체 목록'}))
 expect(await screen.findByText('×3')).toBeTruthy()
 fireEvent.change(screen.getByLabelText('등급'),{target:{value:'rare'}})
 expect(screen.queryByText('×3')).toBeNull()
 expect(screen.getByRole('button',{name:'상어 판매'})).toBeTruthy()
 fireEvent.click(screen.getByRole('button',{name:'쓰레기'}))
 expect(screen.getByText('조건에 맞는 개체가 없어요.')).toBeTruthy()
 fireEvent.change(screen.getByLabelText('등급'),{target:{value:'all'}})
 expect(screen.getByRole('button',{name:'유리병 판매'})).toBeTruthy()
 fireEvent.click(screen.getByRole('button',{name:'전체'}))
 fireEvent.click(screen.getByRole('button',{name:'멸치 판매'}))
 expect(await screen.findByRole('alertdialog')).toBeTruthy()
 fireEvent.click(screen.getByRole('button',{name:'판매 수량 늘리기'}))
 fireEvent.click(screen.getByRole('button',{name:'판매하기'}))
 await waitFor(()=>expect(onSell).toHaveBeenCalledWith(['a','b']))
})
