export function farmDuration(seconds:number){
 const value=Math.max(0,Math.ceil(seconds))
 if(value<60)return `${value}초`
 const minutes=Math.ceil(value/60)
 return minutes<60?`${minutes}분`:`${Math.floor(minutes/60)}시간${minutes%60?` ${minutes%60}분`:''}`
}
