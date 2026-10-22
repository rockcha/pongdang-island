import {readFileSync,writeFileSync,readdirSync,statSync} from 'node:fs'
import {join} from 'node:path'
import {inflateSync,deflateSync,constants} from 'node:zlib'

// Retain all color/alpha/profile chunks and exact PNG scanline bytes. Repack
// IDAT with stronger DEFLATE; no quantization, palette conversion or resizing.
export function optimizePng(input){
 if(!input.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))throw Error('Not PNG')
 const chunks=[];let offset=8
 while(offset<input.length){const n=input.readUInt32BE(offset),end=offset+n+12;if(end>input.length)throw Error('Truncated PNG');chunks.push({type:input.toString('ascii',offset+4,offset+8),bytes:input.subarray(offset,end),data:input.subarray(offset+8,end-4)});offset=end}
 if(chunks.some(c=>c.type==='acTL'))return input
 const data=inflateSync(Buffer.concat(chunks.filter(c=>c.type==='IDAT').map(c=>c.data)))
 let compressed=deflateSync(data,{level:9})
 for(const strategy of [constants.Z_FILTERED,constants.Z_RLE]){const candidate=deflateSync(data,{level:9,strategy});if(candidate.length<compressed.length)compressed=candidate}
 if(!inflateSync(compressed).equals(data))throw Error('Lossless verification failed')
 const body=Buffer.concat([Buffer.from('IDAT'),compressed]),crc=crc32(body)
 const header=Buffer.alloc(4),tail=Buffer.alloc(4);header.writeUInt32BE(compressed.length);tail.writeUInt32BE(crc)
 let wrote=false
 const output=Buffer.concat([input.subarray(0,8),...chunks.flatMap(c=>{if(c.type!=='IDAT')return [c.bytes];if(wrote)return [];wrote=true;return [header,body,tail]})])
 return output.length<input.length?output:input
}
function crc32(bytes){let crc=0xffffffff;for(const byte of bytes){crc^=byte;for(let bit=0;bit<8;bit++)crc=(crc>>>1)^((crc&1)?0xedb88320:0)}return (crc^0xffffffff)>>>0}
if(process.argv[1]?.endsWith('optimize-png-lossless.mjs')){
 let before=0,after=0,count=0
 function walk(path){if(statSync(path).isDirectory()){for(const name of readdirSync(path))walk(join(path,name));return}if(!path.endsWith('.png'))return;const source=readFileSync(path),output=optimizePng(source);before+=source.length;after+=output.length;count++;if(output.length<source.length)writeFileSync(path,output)}
 for(const path of process.argv.slice(2))walk(path)
 console.log(JSON.stringify({files:count,before,after,saved:before-after,percent:before?Math.round((1-after/before)*10000)/100:0}))
}
