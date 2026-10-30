import {readFile,writeFile} from 'node:fs/promises'
import {resolve} from 'node:path'
import {pathToFileURL} from 'node:url'
import ts from 'typescript'
import {createElement} from 'react'
import {renderToStaticMarkup} from 'react-dom/server'

async function load(path){
 let code=ts.transpileModule(await readFile(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2023,jsx:ts.JsxEmit.ReactJSX}}).outputText
 code=code.replaceAll('"react/jsx-runtime"',JSON.stringify(pathToFileURL(resolve('node_modules/react/jsx-runtime.js')).href))
 return import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'))
}
const m=await load('src/features/arcade/tower-defense-engine.ts'),{TowerArt}=await load('src/features/arcade/tower-defense-art.tsx')
const s=m.createDefense();m.beginDefense(s);s.gold=1000
for(const [col,row,kind] of [[14,2,'shell'],[11,2,'puffer'],[8,4,'jelly'],[10,4,'wall'],[9,5,'wall']])m.build(s,m.cellAt(col,row),kind)
const routes=m.ENTRANCES.map(gate=>m.routeCells(s,gate)),route=routes.flatMap(path=>path.slice(0,6)),home=m.SITES[m.HOME],p=m.SITES[m.cellAt(14,2)]
const rocks=[...m.ROCKS].map(cell=>{const p=m.SITES[cell];return '<ellipse cx="'+p.x+'" cy="'+(p.y+4)+'" rx="21" ry="15" fill="#acb79d"/><ellipse cx="'+(p.x-2)+'" cy="'+p.y+'" rx="19" ry="14" fill="#cbd2b7"/><ellipse cx="'+(p.x-5)+'" cy="'+(p.y-5)+'" rx="7" ry="3" fill="#e4e5cb"/>'}).join('')
const pieces=s.buildings.map(b=>{const p=m.SITES[b.cell],art=renderToStaticMarkup(createElement(TowerArt,{kind:b.kind})).replace(/^<svg[^>]*>/,'').replace(/<\/svg>$/,'');return '<g fill="none" transform="translate('+(p.x-22)+' '+(p.y-22)+') scale(.6875)">'+art+'</g>'}).join('')
const guests=route.slice(0,12).filter((_,i)=>i%3===0).map((cell,i)=>{const p=m.SITES[cell],color=['#edb49e','#aad3bf','#bdb5d8'][i%3];return '<g transform="translate('+p.x+' '+p.y+')"><ellipse cy="12" rx="14" ry="4" fill="#687d64" opacity=".15"/><ellipse rx="15" ry="13" fill="'+color+'"/><circle cx="-4" r="1.5" fill="#605f58"/><circle cx="4" r="1.5" fill="#605f58"/><path d="M-2 5h4" stroke="#977e70" stroke-linecap="round"/><ellipse cx="-9" cy="4" rx="3" ry="1.5" fill="#e18d92" opacity=".5"/><ellipse cx="9" cy="4" rx="3" ry="1.5" fill="#e18d92" opacity=".5"/></g>'}).join('')
const gates=m.ENTRANCES.map((cell,index)=>{const p=m.SITES[cell];return '<rect x="'+(p.x-16)+'" y="'+(p.y-17)+'" width="45" height="34" rx="7" fill="#c3d7bb"/><path d="m'+(p.x+20)+' '+(p.y-5)+'-7 5 7 5Z" fill="#78956b"/>'}).join('')
const svg='<svg xmlns="http://www.w3.org/2000/svg" width="'+m.FIELD.width+'" height="'+m.FIELD.height+'" viewBox="0 0 '+m.FIELD.width+' '+m.FIELD.height+'"><defs><pattern id="grid" width="40" height="40" x="36" y="32" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="#93a783" stroke-opacity=".2"/></pattern></defs><rect width="100%" height="100%" fill="#dce9de"/><rect x="22" y="20" width="748" height="420" rx="22" fill="#ede4c7"/><rect x="28" y="26" width="736" height="408" rx="18" fill="#dde9cc"/><rect x="36" y="32" width="720" height="400" fill="url(#grid)"/>'+rocks+'<circle cx="'+p.x+'" cy="'+p.y+'" r="120" fill="#64a77b" fill-opacity=".08" stroke="#69a582" stroke-width="1.5"/>'+gates+pieces+guests+'<rect x="'+(home.x-17)+'" y="'+(home.y-12)+'" width="34" height="25" rx="5" fill="#e4b756"/><path d="M'+(home.x-12)+' '+(home.y-5)+'h24" stroke="#ffe3a1" stroke-width="4"/><circle cx="'+home.x+'" cy="'+(home.y+3)+'" r="5" fill="#8fcdb7"/></svg>\n'
await writeFile('public/arcade/tower-defense/thumbnail.svg',svg)
console.log('Tower defense poster generated from the current map and tower illustrations.')
