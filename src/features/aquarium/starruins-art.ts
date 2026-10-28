import assets from './starruins-bluegold-assets.json'

const reviewed=assets as Record<string,{url:string;small?:string;large?:string}>
/** Versioned, bundled replacements for the existing Star Ruins catalog paths. */
export function starruinsArtUrl(path:string,resolution?:'small'|'large'){
 const asset=Object.hasOwn(reviewed,path)?reviewed[path]:undefined
 return resolution?asset?.[resolution]:asset?.url
}
