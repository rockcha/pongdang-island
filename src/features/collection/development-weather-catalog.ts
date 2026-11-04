import type {CatalogEntry} from './api'
import {weatherCreatures} from '@/features/fishing/weather-creatures'

// Presentation-only entries. Never publish previews into the account cache or inventory.
export type BookCatalogEntry=CatalogEntry&{developmentPreview?:boolean}
export function developmentWeatherCatalog(catalog:CatalogEntry[],enabled=import.meta.env.DEV):BookCatalogEntry[]{
 if(!enabled)return catalog
 const ids=new Set(catalog.map(entry=>entry.id))
 return [...catalog,...weatherCreatures.filter(species=>!ids.has(species.id)).map(species=>({...species,discovered:false,habitats:[],developmentPreview:true}))]
}
