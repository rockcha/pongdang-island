import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import {postFlea} from '@/features/flea-market/api'
import {appQueryClient,setQueryAccount} from '@/lib/account-cache'
const mocks=vi.hoisted(()=>({rpc:vi.fn()}))
vi.mock('@/lib/client',()=>({createClient:()=>({rpc:mocks.rpc})}))
const args={p_side:'buy' as const,p_title:'사요',p_items:[{kind:'fuel' as const,id:'fuel',quantity:1,unit_price:10}],p_operation_id:'quest-post'}
beforeEach(()=>{setQueryAccount('poster');mocks.rpc.mockReset()})
afterEach(()=>{setQueryAccount(null);appQueryClient.clear()})
it.each(['buy','sell'] as const)('refreshes quest progress after a confirmed %s post',async side=>{
 const changed=vi.fn();window.addEventListener('quest-progress-changed',changed)
 try{
  mocks.rpc.mockResolvedValue({data:{id:'post',side},error:null})
  await postFlea({...args,p_side:side})
  expect(changed).toHaveBeenCalledOnce()
  expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith('flea_post',{...args,p_side:side})
 }finally{window.removeEventListener('quest-progress-changed',changed)}
})
it('does not announce progress for rejected posts or late responses from another account',async()=>{
 const changed=vi.fn();window.addEventListener('quest-progress-changed',changed)
 try{
  mocks.rpc.mockResolvedValueOnce({data:null,error:{code:'P0001',message:'FLEA_ITEM_LIMIT'}})
  await expect(postFlea(args)).rejects.toMatchObject({message:'FLEA_ITEM_LIMIT'})
  let resolve!:(value:unknown)=>void;mocks.rpc.mockImplementationOnce(()=>new Promise(done=>{resolve=done}))
  const pending=postFlea(args);setQueryAccount('another-poster');resolve({data:{id:'post'},error:null})
  await expect(pending).rejects.toThrow('ACCOUNT_CHANGED')
  expect(changed).not.toHaveBeenCalled()
 }finally{window.removeEventListener('quest-progress-changed',changed)}
})
