import {useEffect,useRef,useState} from 'react'
import {advanceOcean,drawOcean,type OceanState} from './ocean'
import './sea-exploration.css'

const directions=[{key:'ArrowUp',label:'위로 수영',text:'↑'},{key:'ArrowLeft',label:'왼쪽으로 수영',text:'←'},{key:'ArrowDown',label:'아래로 수영',text:'↓'},{key:'ArrowRight',label:'오른쪽으로 수영',text:'→'}]

function Ocean({submarine}:{submarine:boolean}){
  const canvas=useRef<HTMLCanvasElement>(null),keys=useRef(new Set<string>())
  const [position,setPosition]=useState({x:0,y:0})
  useEffect(()=>{
    const element=canvas.current,ctx=element?.getContext('2d');if(!element||!ctx)return
    let width=0,height=0,frame=0,last=0,lastReadout=0
    let state:OceanState={player:{x:0,y:0},camera:{x:0,y:0},angle:-Math.PI/2,moving:false}
    const resize=()=>{const rect=element.getBoundingClientRect();width=rect.width;height=rect.height;const dpr=Math.min(window.devicePixelRatio||1,2);element.width=Math.round(width*dpr);element.height=Math.round(height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);state.camera={x:state.player.x-width/2,y:state.player.y-height/2}}
    const observer=new ResizeObserver(resize);observer.observe(element);resize()
    const clear=()=>keys.current.clear()
    const visibility=()=>{clear();last=0}
    const down=(event:KeyboardEvent)=>{if(directions.some(d=>d.key===event.key)&&!(event.target instanceof HTMLElement&&event.target.closest('button,a,input,textarea,[role="menu"]'))){event.preventDefault();keys.current.add(event.key)}}
    const up=(event:KeyboardEvent)=>keys.current.delete(event.key)
    window.addEventListener('keydown',down);window.addEventListener('keyup',up);window.addEventListener('blur',clear);document.addEventListener('visibilitychange',visibility)
    const tick=(now:number)=>{
      const dt=last?Math.min((now-last)/1000,.05):0;last=now
      if(!document.hidden){
        const input={x:Number(keys.current.has('ArrowRight'))-Number(keys.current.has('ArrowLeft')),y:Number(keys.current.has('ArrowDown'))-Number(keys.current.has('ArrowUp'))}
        state=advanceOcean(state,input,width,height,dt,submarine?245:170)
        drawOcean(ctx,width,height,state,now/1000,submarine)
        if(now-lastReadout>250){setPosition({x:Math.round(state.player.x/10),y:Math.round(state.player.y/10)});lastReadout=now}
      }
      frame=requestAnimationFrame(tick)
    };frame=requestAnimationFrame(tick)
    return()=>{cancelAnimationFrame(frame);observer.disconnect();clear();window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);window.removeEventListener('blur',clear);document.removeEventListener('visibilitychange',visibility)}
  },[submarine])
  return <>
    <canvas ref={canvas} className="ocean-canvas" aria-label={`${submarine?'잠수함':'퐁이'} 바닷속 탐험. 방향키 또는 화면 방향 버튼으로 이동하세요.`}/>
    <div className="ocean-position">동서 {position.x}m · 남북 {position.y}m</div>
    <div className="ocean-controls" role="group" aria-label="수영 방향">
      {directions.map(d=><button key={d.key} type="button" aria-label={d.label} className={`ocean-key ocean-${d.key}`} onPointerDown={e=>{e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);keys.current.add(d.key)}} onPointerUp={()=>keys.current.delete(d.key)} onPointerCancel={()=>keys.current.delete(d.key)} onLostPointerCapture={()=>keys.current.delete(d.key)} onKeyDown={e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();keys.current.add(d.key)}}} onKeyUp={()=>keys.current.delete(d.key)} onBlur={()=>keys.current.delete(d.key)}>{d.text}</button>)}
    </div>
    <p className="ocean-help">방향키 / 터치로 이동 · 가장자리에서 바다가 이어져요</p>
  </>
}

export function SeaExplorationPage(){
  const [money,setMoney]=useState(10000),[vehicle,setVehicle]=useState<'swim'|'submarine'>('swim'),[exploring,setExploring]=useState(false),[owned,setOwned]=useState(false)
  const price=vehicle==='submarine'&&!owned?3000:0
  const start=()=>{if(money<price)return;setMoney(value=>value-price);if(vehicle==='submarine')setOwned(true);setExploring(true)}
  return <section className={`sea-exploration ${exploring?'is-exploring':''}`} aria-label="바닷속 탐험">
    {exploring?<Ocean submarine={vehicle==='submarine'}/>:<div className="ocean-shore" aria-hidden="true"><div className="ocean-island"/><div className="ocean-pier"/><div className="ocean-shore-pongi">🦦</div></div>}
    <div className="ocean-hud"><span>운영자 체험 · 임시 돈 {money.toLocaleString()}조개</span>{exploring&&<button onClick={()=>setExploring(false)}>해변으로</button>}</div>
    {!exploring&&<div className="ocean-preparation"><span className="ocean-eyebrow">PONGDANG OCEAN</span><h2>바닷속 탐험</h2><p>저 너머에는 어떤 바다가 기다릴까?<br/>오늘은 어디까지든 헤엄쳐 봐요.</p><div className="ocean-choices"><button aria-pressed={vehicle==='swim'} onClick={()=>setVehicle('swim')}><span>🦦</span><strong>맨몸으로 퐁당</strong><small>자유롭게 수영 · 무료</small></button><button aria-pressed={vehicle==='submarine'} onClick={()=>setVehicle('submarine')}><span>🟡</span><strong>작은 잠수함</strong><small>조금 더 빠르게 · {owned?'구매 완료':'3,000조개'}</small></button></div><button className="ocean-start" onClick={start} disabled={money<price}>{price?'구매하고 탐험 시작':'탐험 시작'} →</button><small className="ocean-disclaimer">체험용 조개예요. 실제 골드는 사용하지 않으며 새로고침하면 초기화돼요.</small></div>}
    <div className="ocean-rotate" role="status">휴대폰을 가로로 돌려 주세요<span>넓은 바다에서 탐험할 수 있어요.</span></div>
  </section>
}
