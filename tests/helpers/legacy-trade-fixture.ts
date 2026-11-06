import {initialTopview} from '@/features/farm/topview-model'

// Explicit fixture for regression coverage of the retired order command contracts.
// The live farm provides a separate seed shop and sales counter.
export function legacyTradeFixture(){
 const state=initialTopview()
 state.objects=state.objects.filter(o=>!['market','seedShop','store','processed'].includes(o.kind))
 state.objects.push({id:2,kind:'store',x:11,y:6},{id:22,kind:'processed',x:12,y:13},{id:23,kind:'seedShop',x:8,y:6})
 return state
}
