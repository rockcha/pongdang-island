export function voyageDuration(minutes:number){
 const totalSeconds=Math.max(0,Math.round(minutes*60))
 const hours=Math.floor(totalSeconds/3600),mins=Math.floor(totalSeconds%3600/60),seconds=totalSeconds%60
 return [hours?`${hours}시간`:'',mins?`${mins}분`:'',seconds?`${seconds}초`:''].filter(Boolean).join(' ')||'0분'
}
