import {writeFileSync} from 'node:fs'

// Original short, soft impact; deterministic PCM keeps the asset reproducible.
const rate=44100,duration=.14,count=Math.round(rate*duration),bytes=Buffer.alloc(44+count*2)
bytes.write('RIFF',0);bytes.writeUInt32LE(bytes.length-8,4);bytes.write('WAVEfmt ',8);bytes.writeUInt32LE(16,16)
bytes.writeUInt16LE(1,20);bytes.writeUInt16LE(1,22);bytes.writeUInt32LE(rate,24);bytes.writeUInt32LE(rate*2,28);bytes.writeUInt16LE(2,32);bytes.writeUInt16LE(16,34);bytes.write('data',36);bytes.writeUInt32LE(count*2,40)
let seed=31,noise=0,phase=0
for(let i=0;i<count;i++){
 const time=i/rate,attack=Math.min(1,time/.003),tail=Math.min(1,(duration-time)/.02)
 seed=(Math.imul(seed,1664525)+1013904223)>>>0
 noise=.82*noise+.18*(seed/2147483648-1)
 phase+=2*Math.PI*(65+70*Math.exp(-time*45))/rate
 const value=attack*tail*(.55*Math.sin(phase)*Math.exp(-time*36)+.35*noise*Math.exp(-time*65))
 bytes.writeInt16LE(Math.round(Math.max(-1,Math.min(1,value))*32767),44+i*2)
}
writeFileSync('public/sounds/farm-place.wav',bytes)
