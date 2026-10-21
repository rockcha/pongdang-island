const rates:Record<string,number>={
 'surface-seeking-beanstalk':1.25,
 'upward-sinking-waterfall':3,
}

// Only the foliage/water animates; placed roots, rocks and editing stay still.
export function sharedDecorationFrame(id:string,time:number,reduced=false,editing=false){
 const rate=rates[id]
 return rate===undefined?null:reduced||editing?0:Math.floor(Math.max(0,time)*rate)%4
}
