import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { saveAvatar, validateAvatarFile } from '@/features/profile/avatar-api'
const mocks = vi.hoisted(() => ({upload:vi.fn(),remove:vi.fn(),rpc:vi.fn()}))
vi.mock('@/lib/client',()=>({createClient:()=>({storage:{from:()=>({upload:mocks.upload,remove:mocks.remove})},rpc:mocks.rpc})}))
beforeEach(()=> {mocks.upload.mockResolvedValue({error:null});mocks.remove.mockResolvedValue({error:null});mocks.rpc.mockResolvedValue({error:null})})
afterEach(()=>vi.restoreAllMocks())
describe('avatar upload',()=>{
  it('rejects unsupported, empty and oversized images',()=>{
    expect(validateAvatarFile({type:'image/svg+xml',size:100})).not.toBeNull()
    expect(validateAvatarFile({type:'image/png',size:0})).not.toBeNull()
    expect(validateAvatarFile({type:'image/jpeg',size:6*1024*1024})).not.toBeNull()
    expect(validateAvatarFile({type:'image/webp',size:100})).toBeNull()
  })
  it('uploads a new immutable object, commits metadata, then removes the previous avatar',async()=>{
    await saveAvatar('user-id',new Blob(['webp'],{type:'image/webp'}),'user-id/old.webp')
    expect(mocks.upload.mock.calls[0][0]).toMatch(/^user-id\/.+\.webp$/)
    expect(mocks.upload.mock.calls[0][2]).toMatchObject({upsert:false,contentType:'image/webp'})
    expect(mocks.rpc).toHaveBeenCalledWith('set_player_avatar',{p_path:mocks.upload.mock.calls[0][0]})
    expect(mocks.remove).toHaveBeenCalledWith(['user-id/old.webp'])
    expect(mocks.rpc.mock.invocationCallOrder[0]).toBeLessThan(mocks.remove.mock.invocationCallOrder[0])
  })
  it('cleans the new file on metadata failure without deleting the previous avatar',async()=>{
    mocks.rpc.mockResolvedValue({error:new Error('failed')})
    await expect(saveAvatar('user-id',new Blob(['webp']),'user-id/old.webp')).rejects.toThrow('저장하지 못했어요')
    expect(mocks.remove).toHaveBeenCalledWith([mocks.upload.mock.calls[0][0]])
    expect(mocks.remove).not.toHaveBeenCalledWith(['user-id/old.webp'])
  })
  it('resets the profile before removing the old image',async()=>{
    await saveAvatar('user-id',null,'user-id/old.webp')
    expect(mocks.upload).not.toHaveBeenCalled()
    expect(mocks.rpc).toHaveBeenCalledWith('set_player_avatar',{p_path:null})
    expect(mocks.remove).toHaveBeenCalledWith(['user-id/old.webp'])
  })
})
