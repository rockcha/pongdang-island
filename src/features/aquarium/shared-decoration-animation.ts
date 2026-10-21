const rates:Record<string,number>={
 'surface-seeking-beanstalk':1.25,
 'upward-sinking-waterfall':3,
 'parasol-sponge-tree':1.5,
 'waterwheel-cascade-tower':4,
 'levitating-stone-spire':1,
}


// Animate local details while registered solid anchors and editing stay still.
export function sharedDecorationFrame(id:string,time:number,reduced=false,editing=false){
 const rate=rates[id]
 return rate===undefined?null:reduced||editing?0:Math.floor(Math.max(0,time)*rate)%4
}
