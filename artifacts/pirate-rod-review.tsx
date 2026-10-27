import {useRef,useState,useEffect} from 'react'
import {createRoot} from 'react-dom/client'
import {FishingReel} from '/src/features/fishing/fishing-reel'
import {RodSkinShaft,RodSkinGrip,RodSkinFloat} from '/src/features/fishing/rod-skin-art'
import {RodGauge} from '/src/features/fishing/rod-gauge'
import {fishingRods} from '/src/features/fishing/fishing-rods'
import {rodThumbnailUrl} from '/src/features/fishing/rod-image-assets'
import {regionIcons} from '/src/features/regions/region-icons'
import '/src/index.css'
function Review(){
 const rod=fishingRods.find(r=>r.id==='plunder')!,food=fishingRods.find(r=>r.id==='nyamnyam')!,buttonRef=useRef<HTMLButtonElement>(null),[rotation,setRotation]=useState(0)
 useEffect(()=>{const timer=setInterval(()=>setRotation(n=>n+12),50);return()=>clearInterval(timer)},[])
 return <main><h1><img src={regionIcons.plunder.src}/>약탈자의 항로</h1><section className="cards">{[rod,food].map(r=><article key={r.id}><img className="thumbnail" src={rodThumbnailUrl(r.id)}/><p>{r.name}</p><strong>{r.price.toLocaleString('ko-KR')}원</strong></article>)}</section><section className="live"><h2>해적 낚싯대 · 장착 모습</h2><svg viewBox="0 0 300 190" className="shaft"><RodSkinShaft id="plunder" path="M30 170Q130 50 250 30"/><g transform="translate(30 170)"><RodSkinGrip id="plunder"/></g><g transform="translate(252 117)"><RodSkinFloat id="plunder"/></g></svg><div className="reel"><FishingReel rod={rod} active waiting={false} won={false} pressed={false} reduced={false} tension={62} rotation={rotation} buttonRef={buttonRef} onHold={()=>{}} onRelease={()=>{}}/></div><div className="gauge"><RodGauge rod={rod} tension={62} inline/></div></section></main>
}
createRoot(document.getElementById('root')!).render(<Review/>)
