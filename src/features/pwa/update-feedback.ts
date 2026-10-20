const KEY='pongdang:pwa-update-feedback'
const MAX_AGE=10*60*1000
type Feedback={status:'applying'|'complete';at:number}
function read():Feedback|null{
 try{
  const value=JSON.parse(sessionStorage.getItem(KEY)??'null') as Feedback|null
  if(value&&(value.status==='applying'||value.status==='complete')&&Number.isFinite(value.at)&&Date.now()-value.at>=0&&Date.now()-value.at<MAX_AGE)return value
 }catch{/* Storage can be unavailable in private browsing. */}
 clearPwaUpdateFeedback();return null
}
export function clearPwaUpdateFeedback(){try{sessionStorage.removeItem(KEY)}catch{/* Updating must still work without storage. */}}
export function beginPwaUpdateFeedback(){try{sessionStorage.setItem(KEY,JSON.stringify({status:'applying',at:Date.now()}))}catch{/* Optional feedback only. */}}
export function completePwaUpdateFeedback(){
 const pending=read();if(pending?.status!=='applying')return
 try{sessionStorage.setItem(KEY,JSON.stringify({...pending,status:'complete'}))}catch{/* Optional feedback only. */}
}
export function consumePwaUpdateCompletion(){
 const feedback=read();if(feedback?.status!=='complete')return false
 clearPwaUpdateFeedback();return true
}
