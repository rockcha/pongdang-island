import catalog from './weather-creatures.json'
import type {Species} from '@/features/collection/api'
import type {WeatherKind} from './weather'

// Generated subset for operator practice; rewards are always selected by the server.
export const weatherCreatures=catalog as Species[]
export function weatherPracticePool(kind:WeatherKind){return weatherCreatures.filter(species=>species.weather_type===kind)}
const localArt:Record<string,string>=import.meta.env.DEV?import.meta.glob('/assets/storage-upload/new/20261104-170551/fish/normal/*.png',{eager:true,query:'?url',import:'default'}):{}
export function localWeatherArtUrl(path:string){
 return localArt[`/assets/storage-upload/new/20261104-170551/${path}`]
}
