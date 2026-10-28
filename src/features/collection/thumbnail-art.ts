import assets from './thumbnail-assets.json'
import {starruinsArtUrl} from '@/features/aquarium/starruins-art'

const thumbnails=assets as Record<string,{small:string;large:string}>
/** Only reviewed catalog paths have derivatives. Unknown/private URLs stay untouched. */
export function optimizedThumbnailUrl(path:string,resolution:'small'|'large'='small'){
 return starruinsArtUrl(path,resolution)??(Object.hasOwn(thumbnails,path)?thumbnails[path][resolution]:undefined)
}
