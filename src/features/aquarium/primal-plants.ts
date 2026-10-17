const plants:Record<string,string>={
 'broadleaf-water-fern':'normal',
 'purple-fork-seaweed':'normal',
 'giant-fan-water-fern':'rare',
}
// Keep the database's static decoration contract; reviewed plant sheets are bundled.
export function primalPlantAsset(id:string,kind:string){
 const folder=plants[id]
 return kind==='decoration'&&folder?{path:`decorations/${folder}/${id}_sprite.png`,url:`/aquarium/plants/${id}_sprite.png`}:null
}
export function primalPlantFrame(id:string,time:number,reduced=false,editing=false){
 return plants[id]?reduced||editing?0:Math.floor(Math.max(0,time)*1.2)%4:null
}
