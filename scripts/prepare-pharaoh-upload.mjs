import fs from 'node:fs'
import path from 'node:path'
import {batch,items} from './prepare-pharaoh-assets.mjs'
export const uploadRoot='.cache/pharaoh-upload'
export const uploadPaths=[...items.flatMap(i=>[i.thumbnail_path,...(i.sprite_sheet_path?[i.sprite_sheet_path]:[])]),...['thumbnail','reel-frame','reel-rotor','float'].map(f=>'equipment/rods/pharaoh/'+f+'.png')]
if(process.argv[1]?.replaceAll('\\','/').endsWith('/prepare-pharaoh-upload.mjs')){
 for(const p of uploadPaths){const target=uploadRoot+'/'+p;fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(batch+'/'+p,target)}
 console.log('Prepared '+uploadPaths.length+' immutable upload files; QA sheets excluded')
}
