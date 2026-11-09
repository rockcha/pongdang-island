import {expect,it} from 'vitest'
import {developmentWeatherCatalog} from '@/features/collection/development-weather-catalog'
import {weatherCreatures} from '@/features/fishing/weather-creatures'
it('leaves production catalog untouched and does not mutate the server snapshot',()=>{
 const server=[]
 expect(developmentWeatherCatalog(server,false)).toBe(server)
 const preview=developmentWeatherCatalog(server,true)
 expect(preview).toHaveLength(20);expect(server).toEqual([])
 expect(preview.every(s=>s.discovered===false&&s.developmentPreview)).toBe(true)
})
it('keeps authoritative discovery flags when the server already supplies a weather creature',()=>{
 const real={...weatherCreatures[0],discovered:true,habitats:[]}
 const catalog=developmentWeatherCatalog([real],true)
 expect(catalog).toHaveLength(20)
 expect(catalog.find(s=>s.id===real.id)).toBe(real)
 expect(catalog.filter(s=>s.discovered)).toHaveLength(1)
})
