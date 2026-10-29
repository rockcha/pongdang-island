import sharp from 'sharp'
import {readFileSync} from 'node:fs'
const svg=readFileSync('public/notification-icons/push-badge.svg')
for(const name of ['push-badge.png','push-badge-pongi-v1.png']){
 await sharp(svg).resize(96,96).png().toFile('public/notification-icons/'+name)
}
console.log('Built 96×96 transparent monochrome Pongi notification badges.')
