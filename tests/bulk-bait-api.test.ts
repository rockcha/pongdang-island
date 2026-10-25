import {expect,it,vi} from 'vitest'
const mock=vi.hoisted(()=>({rpc:vi.fn()}))
vi.mock('@/lib/client',()=>({createClient:()=>({rpc:mock.rpc})}))
import {transactGold} from '@/features/gold/api'
it('sends the quantity and unit quote through a single bulk RPC',async()=>{
 mock.rpc.mockResolvedValue({data:{gold:700,inventory:{bait:30},delta:-300},error:null})
 await transactGold({type:'buy',id:'fishing:bait',quantity:30,expectedPrice:10},'bulk-operation')
 expect(mock.rpc).toHaveBeenCalledTimes(1)
 expect(mock.rpc).toHaveBeenCalledWith('buy_fishing_bait_bulk',{p_bait_id:'bait',p_quantity:30,p_operation_id:'bulk-operation',p_expected_price:10})
})
