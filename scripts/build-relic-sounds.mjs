import {writeFileSync} from 'node:fs'

// Original short chimes: ascending glass tones to equip, descending to release.
const sampleRate=22050
function chime(name,notes,duration){
 const count=Math.ceil(duration*sampleRate),data=Buffer.alloc(44+count*2)
 data.write('RIFF');data.writeUInt32LE(data.length-8,4);data.write('WAVEfmt ',8)
 data.writeUInt32LE(16,16);data.writeUInt16LE(1,20);data.writeUInt16LE(1,22)
 data.writeUInt32LE(sampleRate,24);data.writeUInt32LE(sampleRate*2,28);data.writeUInt16LE(2,32);data.writeUInt16LE(16,34)
 data.write('data',36);data.writeUInt32LE(count*2,40)
 for(let i=0;i<count;i++){
  const t=i/sampleRate
  const signal=notes.reduce((sum,[frequency,start,level])=>{
   const age=t-start
   if(age<0)return sum
   const envelope=Math.min(1,age/.008)*Math.exp(-age*15)*Math.min(1,(duration-t)/.025)
   return sum+level*envelope*(Math.sin(2*Math.PI*frequency*age)+.18*Math.sin(2*Math.PI*frequency*2.01*age))
  },0)
  data.writeInt16LE(Math.round(Math.max(-1,Math.min(1,signal))*.65*32767),44+i*2)
 }
 writeFileSync(`public/sounds/${name}.wav`,data)
}
chime('relic-equip',[[659.25,0,.38],[987.77,.07,.32],[1318.51,.14,.28]],.48)
chime('relic-unequip',[[783.99,0,.34],[523.25,.065,.30]],.34)
// Four-second gathering motif, followed by a distinct confirmed outcome.
chime('relic-forge',Array.from({length:24},(_,i)=>[329.63*2**(i/30),.12+i*.153,.12+i*.003]),4)
chime('relic-success',[[523.25,0,.28],[659.25,.1,.27],[783.99,.2,.25],[1046.5,.32,.3],[1318.51,.4,.18]],1.05)
chime('relic-failure',[[440,0,.22],[369.99,.12,.19],[261.63,.25,.15]],.85)
