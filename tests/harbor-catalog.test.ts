import {beforeEach,expect,it,vi} from 'vitest'
import {loadHarborCatalog} from '@/features/regions/harbor-catalog'
import {regionalMythics} from '@/features/regions/harbor-mythic-showcase'
const mock=vi.hoisted(()=>({from:vi.fn(),responses:{} as Record<string,{data:unknown;error:unknown}>}))
vi.mock('@/lib/client',()=>({createClient:()=>({from:mock.from})}))
beforeEach(()=>{
 mock.responses={collectible_species:{data:[{id:'first',rarity:'mythic'},{id:'second',rarity:'mythic'}],error:null},player_discoveries:{data:[{species_id:'second'}],error:null},collectible_habitats:{data:[{species_id:'first',region_id:'coral'},{species_id:'second',region_id:'coral'},{species_id:'second',region_id:'pongdang'}],error:null}}
 mock.from.mockImplementation(table=>{const query={select:()=>query,order:()=>query,range:(from:number,to:number)=>{const response=mock.responses[table];return Promise.resolve({...response,data:(response.data as unknown[]|null)?.slice(from,to+1)??null})}};return query})
})
it('loads each species actual habitats and personal discovery independently',async()=>{
 const catalog=await loadHarborCatalog()
 expect(catalog[0]).toMatchObject({id:'first',discovered:false,habitats:[{id:'coral'}]})
 expect(catalog[1]).toMatchObject({id:'second',discovered:true,habitats:[{id:'coral'},{id:'pongdang'}]})
})
it('fails rather than promoting unverified habitats when that query fails',async()=>{
 mock.responses.collectible_habitats={data:null,error:new Error('offline')}
 await expect(loadHarborCatalog()).rejects.toThrow('offline')
})
it('includes Siren mythics whose habitats fall beyond the first thousand rows',async()=>{
 mock.responses.collectible_species.data=[{id:'siren-siren-last-song',name:'Siren',kind:'fish',rarity:'mythic',is_native:true,native_region_id:'siren'}]
 mock.responses.collectible_habitats.data=[...Array.from({length:1300},(_,i)=>({species_id:`earlier-${i}`,region_id:'coral'})),{species_id:'siren-siren-last-song',region_id:'siren'}]
 const catalog=await loadHarborCatalog()
 expect(regionalMythics(catalog,'siren').map(item=>item.id)).toEqual(['siren-siren-last-song'])
})
