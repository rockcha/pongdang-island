if(typeof HTMLDialogElement!=='undefined'){
 HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','')}
 HTMLDialogElement.prototype.close=function(){this.removeAttribute('open')}
}
import { afterEach } from 'vitest'
import { appQueryClient, setQueryAccount } from '@/lib/account-cache'
afterEach(() => { setQueryAccount(null); appQueryClient.clear() })
