import {afterEach,expect,it,vi} from 'vitest'
import {watchPwaUpdates} from '../src/features/pwa/update-check'
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
 await vi.advanceTimersByTimeAsync(60_000);expect(update).toHaveBeenCalledTimes(2)
 stop()
})
