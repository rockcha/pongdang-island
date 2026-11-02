import fs from 'node:fs'
import {createHash} from 'node:crypto'
const root='assets/references/hunmin-typeface'
fs.mkdirSync(root,{recursive:true})
const source='https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@600&text='+encodeURIComponent('ㆍㅡㅣㄱㄴㄷ가나다ㆁㅿㆆ')
const css=await (await fetch(source,{headers:{'User-Agent':'Mozilla/5.0'}})).text()
const url=css.match(/url\((https:[^)]+)\)/)?.[1]
if(!url)throw Error('Typeface subset missing')
const response=await fetch(url)
if(!response.ok)throw Error('Typeface download failed')
const bytes=Buffer.from(await response.arrayBuffer())
fs.writeFileSync(root+'/noto-serif-kr-600-subset.font',bytes)
const license=await fetch('https://raw.githubusercontent.com/google/fonts/main/ofl/notoserifkr/OFL.txt')
if(!license.ok)throw Error('Typeface license missing')
fs.writeFileSync(root+'/OFL.txt',await license.text())
fs.writeFileSync(root+'/source.json',JSON.stringify({family:'Noto Serif KR',weight:600,letters:'ㆍㅡㅣㄱㄴㄷ가나다ㆁㅿㆆ',source,url,sha256:createHash('sha256').update(bytes).digest('hex'),license:'SIL Open Font License 1.1'},null,2)+'\n')
console.log(JSON.stringify({bytes:bytes.length,family:'Noto Serif KR',weight:600}))
