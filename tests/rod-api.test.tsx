import {afterEach,expect,it,vi} from 'vitest'
import {loadRods,equipRod} from '@/features/fishing/rod-api'
import {transactGold} from '@/features/gold/api'
const {rpc}=vi.hoisted(()=>({rpc:vi.fn()}))
vi.mock('@/lib/client',()=>({createClient:()=>({rpc})}))
afterEach(()=>vi.clearAllMocks())
it('routes purchases and sales through the server RPC and retains the operation ID',async()=>{
 rpc.mockResolvedValue({data:{gold:400},error:null})
 const changed=vi.fn();window.addEventListener('fishing-rods-changed',changed)
 try{
  await transactGold({type:'buy',id:'rod:bronze'},'same-operation')
  expect(rpc).toHaveBeenLastCalledWith('trade_fishing_rod',{p_rod_id:'bronze',p_action:'buy',p_operation_id:'same-operation'})
  await transactGold({type:'sell',id:'rod:bronze'},'sale-operation')
  expect(rpc).toHaveBeenLastCalledWith('trade_fishing_rod',{p_rod_id:'bronze',p_action:'sell',p_operation_id:'sale-operation'})
  expect(changed).toHaveBeenCalledTimes(2)
 }finally{window.removeEventListener('fishing-rods-changed',changed)}
})
it('loads server ownership and equips through authenticated RPCs',async()=>{
 rpc.mockResolvedValue({data:{owned:['basic'],selected:'basic'},error:null})
 expect(await loadRods()).toMatchObject({owned:['basic']})
 expect(rpc).toHaveBeenLastCalledWith('fishing_rod_state')
 await equipRod('basic')
 expect(rpc).toHaveBeenLastCalledWith('equip_fishing_rod',{p_rod_id:'basic'})
 rpc.mockResolvedValue({data:null,error:{message:'ROD_NOT_OWNED'}})
 await expect(equipRod('calm')).rejects.toMatchObject({message:'ROD_NOT_OWNED'})
})
