// Translation only. Moving wings and cloth must never determine body position.
export function spriteAnchorConsensus(probes,{frameCount=8,maxRmse=40,maxDisagreement=8}={}){
 if(probes.length<3)throw Error('At least three independently reviewed rigid anchors are required')
 const median=values=>[...values].sort((a,b)=>a-b)[Math.floor(values.length/2)]
 return Array.from({length:frameCount},(_,frame)=>{
  const samples=probes.map(p=>p.frames.find(f=>f.frame===frame))
  if(samples.some(s=>!s||![s.dx,s.dy,s.rmse].every(Number.isFinite)||s.rmse>maxRmse))throw Error('Unreliable rigid anchor at frame '+frame)
  const xs=samples.map(s=>s.dx),ys=samples.map(s=>s.dy)
  if(Math.max(...xs)-Math.min(...xs)>maxDisagreement||Math.max(...ys)-Math.min(...ys)>maxDisagreement)throw Error('Rigid anchors disagree at frame '+frame)
  return {frame,dx:median(xs),dy:median(ys)}
 })
}
