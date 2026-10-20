import {afterEach,expect,it,vi} from 'vitest'
import {prepareLatestPwaUpdate,watchPwaUpdates} from '../src/features/pwa/update-check'
afterEach(()=>{vi.useRealTimers();vi.restoreAllMocks()})
it('checks immediately, periodically and on return, and cleans up listeners',async()=>{
 vi.useFakeTimers()
 const update=vi.fn().mockResolvedValue(undefined)
 const stop=watchPwaUpdates({update} as unknown as ServiceWorkerRegistration)
 await Promise.resolve();expect(update).toHaveBeenCalledTimes(1)
 await vi.advanceTimersByTimeAsync(60_000);expect(update).toHaveBeenCalledTimes(2)
 window.dispatchEvent(new Event('focus'));await Promise.resolve()
 expect(update).toHaveBeenCalledTimes(3)
 stop();window.dispatchEvent(new Event('online'))
 await vi.advanceTimersByTimeAsync(60_000);expect(update).toHaveBeenCalledTimes(3)
})
it('skips offline and pending checks and recovers from a failed update',async()=>{
 vi.useFakeTimers();vi.spyOn(navigator,'onLine','get').mockReturnValue(false)
 const update=vi.fn().mockRejectedValueOnce(new Error('network')).mockResolvedValue(undefined)
 const registration={update,waiting:null,installing:null}
 const stop=watchPwaUpdates(registration as unknown as ServiceWorkerRegistration)
 expect(update).not.toHaveBeenCalled()
 vi.spyOn(navigator,'onLine','get').mockReturnValue(true)
 window.dispatchEvent(new Event('online'));window.dispatchEvent(new Event('focus'))
 expect(update).toHaveBeenCalledTimes(1)
 await vi.advanceTimersByTimeAsync(60_000);expect(update).toHaveBeenCalledTimes(2)
 registration.waiting={} as never
 await vi.advanceTimersByTimeAsync(60_000);expect(update).toHaveBeenCalledTimes(3)
 stop()
})

it('rechecks even with an older waiting version and waits for the newest installation',async()=>{
 vi.useFakeTimers()
 const older={state:'installed'}
 const latest=Object.assign(new EventTarget(),{state:'installing'})
 const registration={waiting:older,installing:null as unknown,update:vi.fn().mockImplementation(async()=>{registration.installing=latest})}
 const ready=vi.fn()
 const result=prepareLatestPwaUpdate(registration as unknown as ServiceWorkerRegistration,new AbortController().signal).then(ready)
 await Promise.resolve();expect(registration.update).toHaveBeenCalledOnce();expect(ready).not.toHaveBeenCalled()
 latest.state='installed';registration.installing=null;registration.waiting=latest
 latest.dispatchEvent(new Event('statechange'))
 await vi.advanceTimersByTimeAsync(0);await result
 expect(ready).toHaveBeenCalledOnce();expect(registration.waiting).toBe(latest)
})

it('does not fall back to a stale waiting version when the latest download fails',async()=>{
 const registration={waiting:{state:'installed'},update:vi.fn().mockRejectedValue(new Error('offline'))}
 await expect(prepareLatestPwaUpdate(registration as unknown as ServiceWorkerRegistration,new AbortController().signal)).rejects.toThrow('offline')
})

it('cancels a pending installation when the update is no longer safe to apply',async()=>{
 const worker=Object.assign(new EventTarget(),{state:'installing'})
 const registration={installing:worker,waiting:{state:'installed'},update:vi.fn().mockResolvedValue(undefined)}
 const controller=new AbortController()
 const result=prepareLatestPwaUpdate(registration as unknown as ServiceWorkerRegistration,controller.signal)
 await Promise.resolve();controller.abort()
 await expect(result).rejects.toThrow()
})
