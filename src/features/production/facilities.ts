export function productionDuration(minutes:number){
 const hours=Math.floor(minutes/60),rest=minutes%60
 return hours?`${hours}시간${rest?` ${rest}분`:''}`:`${rest}분`
}
