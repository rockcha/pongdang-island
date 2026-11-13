import { beforeEach, afterEach, expect, it, vi } from 'vitest'
import { startTowerDefense, saveTowerDefense, readTowerDefense, readTowerRanking } from '@/features/arcade/tower-defense-api'
import { emptyTowerReplay } from '@/features/arcade/tower-defense-replay'
import { setQueryAccount, appQueryClient, accountQueryKey } from '@/lib/account-cache'
const api=vi.hoisted(()=>({rpc:vi.fn(),invoke:vi.fn(),abort:vi.fn()}))
vi.mock('@/lib/client',()=>({createClient:()=>({rpc:api.rpc,functions:{invoke:api.invoke}})}))
const snapshot={run:{id:'run'},wallet:{gold:1234},serverNow:new Date().toISOString()}
beforeEach(()=>{setQueryAccount('A');api.rpc.mockReset();api.invoke.mockReset();api.abort.mockReset()})
afterEach(()=>{setQueryAccount(null);appQueryClient.clear()})
it('forwards cancellation for state and paginated rankings',async()=>{
  api.rpc.mockReturnValue({abortSignal:api.abort});api.abort.mockResolvedValue({data:snapshot,error:null})
  const signal=new AbortController().signal
  await readTowerDefense(signal);await readTowerRanking(signal,20)
  expect(api.rpc).toHaveBeenCalledWith('tower_defense_leaderboard',{p_offset:20})
  expect(api.abort.mock.calls).toEqual([[signal],[signal]])
})
it('retains entry operation identity and publishes the confirmed state and wallet',async()=>{
  api.rpc.mockResolvedValue({data:snapshot,error:null})
  await startTowerDefense('same-operation')
  expect(api.rpc).toHaveBeenCalledExactlyOnceWith('tower_defense_start',{p_operation_id:'same-operation',p_engine_version:1})
  expect(appQueryClient.getQueryData(accountQueryKey('A','tower-defense'))).toEqual(snapshot)
  expect(appQueryClient.getQueryData(accountQueryKey('A','wallet'))).toEqual(snapshot.wallet)
})
it('does not retry a lost settlement automatically or publish late responses after A to B to A',async()=>{
  const replay=emptyTowerReplay()
  api.invoke.mockResolvedValueOnce({data:null,error:Error('network')})
  await expect(saveTowerDefense('run',replay,false)).rejects.toThrow('network')
  expect(api.invoke).toHaveBeenCalledTimes(1)
  let resolve!:(value:unknown)=>void
  api.invoke.mockImplementation(()=>new Promise(done=>{resolve=done}))
  const pending=saveTowerDefense('run',replay,true)
  setQueryAccount('B');setQueryAccount('A');resolve({data:snapshot,error:null})
  await expect(pending).rejects.toThrow('ACCOUNT_CHANGED')
  expect(appQueryClient.getQueryData(accountQueryKey('A','wallet'))).toBeUndefined()
})
