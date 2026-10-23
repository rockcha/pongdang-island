import {readFileSync,writeFileSync,mkdirSync} from 'node:fs'

// Keep original uploads intact. Copy complete MPEG frames for small Web Audio
// loops so a ten-minute ambience never becomes a huge decoded PCM buffer.
const outputs=[['aquarium-ambience.mp3','aquarium-water-loop.mp3',20],['fishing-bg.mp3','fishing-water-loop.mp3',20],['reel.mp3','reel-four-seconds.mp3',4]]
mkdirSync('public/sounds/buffers',{recursive:true})
for(const [source,target,seconds] of outputs){
 const input=readFileSync('public/sounds/'+source),frames=[]
 let cursor=0,duration=0,started=false
 if(input.toString('ascii',0,3)==='ID3')cursor=10+((input[6]&127)<<21)+((input[7]&127)<<14)+((input[8]&127)<<7)+(input[9]&127)
 while(cursor+4<=input.length&&duration<seconds){
  const header=input.readUInt32BE(cursor),version=(header>>>19)&3,layer=(header>>>17)&3,rate=(header>>>10)&3,bitrate=(header>>>12)&15
  if((header>>>21)!==2047||version===1||layer!==1||rate===3||bitrate===0||bitrate===15){if(started)throw Error('Unexpected MPEG frame in '+source);cursor++;continue}
  const sampleRate=[44100,48000,32000][rate]/(version===3?1:version===2?2:4)
  const kbps=(version===3?[0,32,40,48,56,64,80,96,112,128,160,192,224,256,320]:[0,8,16,24,32,40,48,56,64,80,96,112,128,144,160])[bitrate]
  const length=Math.floor((version===3?144:72)*kbps*1000/sampleRate)+((header>>>9)&1)
  if(cursor+length>input.length)break
  const frame=input.subarray(cursor,cursor+length);cursor+=length
  // A copied Xing/Info frame would advertise the original long duration.
  if(!started&&(frame.includes(Buffer.from('Xing'))||frame.includes(Buffer.from('Info'))||frame.includes(Buffer.from('VBRI'))))continue
  started=true;frames.push(frame);duration+=(version===3?1152:576)/sampleRate
 }
 if(duration<seconds*.95)throw Error('Not enough audio in '+source)
 const output=Buffer.concat(frames);writeFileSync('public/sounds/buffers/'+target,output)
 console.log(`${target}: ${duration.toFixed(2)}s, ${output.length} bytes`)
}
