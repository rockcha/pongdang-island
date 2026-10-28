import assets from './background-preview-assets.json'

const previews=assets as Record<string,{url:string;width:number;height:number}>
// Shop cards use derivatives; equipped aquarium backgrounds keep their original URLs.
export function backgroundPreviewArt(path:string){
 return Object.hasOwn(previews,path)?previews[path]:undefined
}
