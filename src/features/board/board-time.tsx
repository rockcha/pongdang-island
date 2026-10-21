import {useEffect,useState} from 'react'

export function boardTime(value:string,now=Date.now()){
 const time=new Date(value),elapsed=Math.max(0,now-time.getTime())
 if(!Number.isFinite(elapsed))return ''
 const minutes=Math.floor(elapsed/60000),hours=Math.floor(minutes/60),days=Math.floor(hours/24)
 if(minutes<1)return '방금 전'
 if(minutes<60)return `${minutes}분 전`
 if(hours<24)return `${hours}시간 전`
 if(days===1)return '어제'
 if(days<7)return `${days}일 전`
 return time.toLocaleDateString('ko-KR',{...(time.getFullYear()!==new Date(now).getFullYear()?{year:'numeric' as const}:{}),month:'long',day:'numeric'})
}

export function BoardTime({value,className}:{value:string;className?:string}){
 const [now,setNow]=useState(()=>Date.now())
 useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),60000);return()=>clearInterval(timer)},[])
 return <time dateTime={value} title={new Date(value).toLocaleString('ko-KR')} className={className}>{boardTime(value,now)}</time>
}
