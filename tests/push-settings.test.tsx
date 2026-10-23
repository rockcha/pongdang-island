import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react'
import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import {PushSettings} from '@/features/notifications/push-settings'
const api=vi.hoisted(()=>({supportsPush:vi.fn(),needsHomeScreen:vi.fn(),pushConfiguration:vi.fn(),currentPushDevice:vi.fn(),enablePush:vi.fn(),disablePush:vi.fn(),savePushCategories:vi.fn(),queuePushTest:vi.fn()}))
vi.mock('@/features/notifications/push-device',()=>({...api,pushCategories:['production','bait-production','expedition','harbor']}))
vi.mock('@/components/auth-provider',()=>({useAuth:()=>({session:{user:{id:'owner'}}})}))
beforeEach(()=>{api.supportsPush.mockReturnValue(true);api.needsHomeScreen.mockReturnValue(false);api.pushConfiguration.mockResolvedValue({configured:true,publicKey:'public-key'});api.currentPushDevice.mockResolvedValue({registered:false,categories:[]});api.enablePush.mockResolvedValue({registered:true});api.queuePushTest.mockResolvedValue(undefined)})
afterEach(()=>{cleanup();vi.resetAllMocks()})
it('enables only on interaction and queues an explicit self-test',async()=>{
 render(<PushSettings/>);const toggle=await screen.findByRole('switch',{name:'이 기기 푸시 알림'})
 await waitFor(()=>expect(toggle.hasAttribute('disabled')).toBe(false))
 expect(api.enablePush).not.toHaveBeenCalled()
 fireEvent.click(toggle)
 await screen.findByRole('button',{name:'테스트 알림 받기'})
 expect(api.enablePush).toHaveBeenCalledWith('owner','public-key',['production','bait-production','expedition','harbor'])
 fireEvent.click(screen.getByRole('button',{name:'테스트 알림 받기'}))
 expect(await screen.findByText(/테스트 알림을 예약했어요/)).toBeTruthy()
 expect(api.queuePushTest).toHaveBeenCalledOnce()
})
it('saves per-device categories and unregisters this device',async()=>{
 api.currentPushDevice.mockResolvedValue({registered:true,categories:['production','bait-production','expedition','harbor']})
 render(<PushSettings/>);await screen.findByRole('checkbox',{name:'연료 생산 완료'})
 fireEvent.click(screen.getByRole('checkbox',{name:'연료 생산 완료'}))
 await waitFor(()=>expect(api.savePushCategories).toHaveBeenCalledWith(['bait-production','expedition','harbor']))
 fireEvent.click(screen.getByRole('switch',{name:'이 기기 푸시 알림'}))
 await screen.findByText('이 기기의 푸시 알림을 껐어요.')
 expect(api.disablePush).toHaveBeenCalledOnce()
})
it('explains the home-screen requirement instead of requesting permission in Safari tabs',()=>{
 api.needsHomeScreen.mockReturnValue(true);render(<PushSettings/>)
 expect(screen.getByText('홈 화면에 추가')).toBeTruthy()
 expect(screen.queryByRole('switch')).toBeNull();expect(api.pushConfiguration).not.toHaveBeenCalled()
})
it('keeps registration unavailable while the server is not configured',async()=>{
 api.pushConfiguration.mockResolvedValue({configured:false,publicKey:null});render(<PushSettings/>)
 await screen.findByText(/푸시 알림을 준비하고 있어요/)
 expect(screen.getByRole('switch').hasAttribute('disabled')).toBe(true)
})
