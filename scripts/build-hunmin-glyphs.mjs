// Offline authoring tool. Install with:
// npm install --prefix tmp/hunmin-font-tools --no-package-lock --no-save fontkit@2.0.4
// Runtime uses the generated mesh only; no font parser or network font loading.
import fs from 'node:fs'
import path from 'node:path'
import {createRequire} from 'node:module'
import {createHash} from 'node:crypto'
const require=createRequire(import.meta.url),fontkit=createRequire(path.resolve('tmp/hunmin-font-tools/package.json'))('fontkit')
const earcut=require('../node_modules/phaser/src/geom/polygon/Earcut.js')
const root='assets/references/hunmin-typeface',bytes=fs.readFileSync(root+'/noto-serif-kr-600-subset.font'),font=fontkit.create(bytes)
const source=JSON.parse(fs.readFileSync(root+'/source.json','utf8'))
if(createHash('sha256').update(bytes).digest('hex')!==source.sha256)throw Error('Typeface source changed')
const area=p=>p.reduce((sum,[x,y],i)=>{const [nx,ny]=p[(i+1)%p.length];return sum+x*ny-nx*y},0)/2
const contains=(poly,[x,y])=>{let inside=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const [xi,yi]=poly[i],[xj,yj]=poly[j];if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)inside=!inside}return inside}
const round=n=>Math.round(n*100000)/100000,glyphs={}
for(const letter of source.letters){
 if(!font.hasGlyphForCodePoint(letter.codePointAt(0)))throw Error('Missing glyph '+letter)
 const glyph=font.glyphForCodePoint(letter.codePointAt(0)),contours=[];let points=[],cursor=[0,0]
 const add=(x,y)=>{cursor=[x,y];points.push([round((x-glyph.advanceWidth/2)/font.unitsPerEm),round((440-y)/font.unitsPerEm)])}
 for(const {command,args:a} of glyph.path.commands){
  if(command==='moveTo'){if(points.length)contours.push(points);points=[];add(...a)}
  else if(command==='lineTo')add(...a)
  else if(command==='quadraticCurveTo'){
   const [x,y]=cursor;for(let i=1;i<=4;i++){const t=i/4,u=1-t;add(u*u*x+2*u*t*a[0]+t*t*a[2],u*u*y+2*u*t*a[1]+t*t*a[3])}
  }else if(command==='bezierCurveTo'){
   const [x,y]=cursor;for(let i=1;i<=6;i++){const t=i/6,u=1-t;add(u*u*u*x+3*u*u*t*a[0]+3*u*t*t*a[2]+t*t*t*a[4],u*u*u*y+3*u*u*t*a[1]+3*u*t*t*a[3]+t*t*t*a[5])}
  }else if(command==='closePath'){if(points.length)contours.push(points);points=[]}
  else throw Error('Unsupported font path '+command)
 }
 if(points.length)contours.push(points)
 const rings=contours.map(p=>p.filter((v,i)=>!i||v[0]!==p[i-1][0]||v[1]!==p[i-1][1])).filter(p=>p.length>=3)
 const parents=rings.map((p,i)=>rings.map((q,j)=>({j,size:Math.abs(area(q))})).filter(q=>q.j!==i&&q.size>Math.abs(area(p))&&p.every(point=>contains(rings[q.j],point))).sort((a,b)=>a.size-b.size)[0]?.j??-1)
 const depth=i=>parents[i]===-1?0:1+depth(parents[i]),triangles=[]
 for(const [i,outer] of rings.entries())if(depth(i)%2===0){
  const holes=rings.filter((_,j)=>parents[j]===i),all=[outer,...holes],flat=all.flat(),starts=[];let count=outer.length
  for(const hole of holes){starts.push(count);count+=hole.length}
  const indices=earcut(flat.flat(),starts,2)
  for(let j=0;j<indices.length;j+=3)triangles.push(indices.slice(j,j+3).map(k=>flat[k]))
 }
 const expected=rings.reduce((sum,p,i)=>sum+Math.abs(area(p))*(depth(i)%2?-1:1),0),actual=triangles.reduce((s,t)=>s+Math.abs(area(t)),0)
 if(Math.abs(expected-actual)>.00001)throw Error('Glyph hole/mesh mismatch '+letter+' expected '+expected+' actual '+actual+' rings '+rings.length)
 glyphs[letter]={contours:rings,triangles}
}
fs.writeFileSync('src/features/aquarium/hunmin-glyphs.json',JSON.stringify({family:source.family,weight:source.weight,sourceSha256:source.sha256,glyphs})+'\n')
console.log(JSON.stringify({glyphs:Object.keys(glyphs).length,triangles:Object.values(glyphs).reduce((s,g)=>s+g.triangles.length,0)}))
