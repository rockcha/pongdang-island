import React from 'react'
import {createRoot} from 'react-dom/client'
import {Building} from '/src/features/my-island/island-art'
import {facilities,facilityFor,defaultState,isLand} from '/src/features/my-island/island-model'
import {ownedFacilities} from '/src/features/my-island/owned-facilities'
import {createGroupedIsland} from '/src/features/my-island/island-starter-layout'
import {buildingViewBox} from '/src/features/my-island/island-art-sizing'
import {facilityPng} from '/src/features/my-island/facility-png-art'
import {FloorPatterns,FloorSwatch} from '/src/features/my-island/floor-art'
import {floorTiles} from '/src/features/my-island/island-model'
const dark=new URLSearchParams(location.search).has('dark'),items=ownedFacilities(),state=createGroupedIsland(items,defaultState())
const catalog=[...new Map([...items,...facilities].map(f=>[facilityPng(f),f])).values()]
document.body.style.cssText=`margin:0;background:${dark?'#242d30':'#fff6e8'};color:${dark?'#f4e7cf':'#694e39'};font:14px system-ui`
createRoot(document.getElementById('root')!).render(<main style={{maxWidth:1200,margin:'auto',padding:16}}><h1 style={{fontSize:20}}>나의 퐁당섬 · 정면 아트</h1><p>실제 배치·상점 컴포넌트를 사용하는 이미지 검수 화면</p>
 <svg data-island-preview viewBox="180 40 1000 1020" style={{width:'100%',maxHeight:900,background:dark?'#314a50':'#cce7e2',borderRadius:24}}><FloorPatterns/>
  {Array.from({length:36},(_,y)=>Array.from({length:40},(_,x)=>isLand(x,y,state.land,state.removedLand)?<rect key={x+':'+y} x={x*32} y={y*32} width="32" height="32" fill="url(#island-floor-grass)"/>:null))}
  {state.paving.map(p=><rect key={p.x+':'+p.y} x={p.x*32} y={p.y*32} width="32" height="32" fill={`url(#island-floor-${p.type})`}/>)}
  {state.layout.toSorted((a,b)=>a.y-b.y).map(p=>{const f=items.find(f=>f.id===p.id)??facilityFor(p.id);return f&&<g key={p.id} transform={`translate(${p.x*32} ${p.y*32})`}><Building f={f} rotation={p.rotation} label={state.signLabels[p.id]}/></g>})}
 </svg><h2>건물·장식품</h2><section style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(110px,1fr))',gap:10}}>{catalog.map(f=><article key={f.id} style={{padding:8,border:'1px solid #a98a5c44',borderRadius:14}}><svg viewBox={buildingViewBox(f)} width="100%" height="116"><Building f={f} label={f.kind==='arrow-sign'?'바닷길':f.kind==='name-sign'?'나의 섬':undefined}/></svg><p style={{textAlign:'center',fontSize:11}}>{f.name}</p></article>)}</section>
 <h2>바닥 타일 · 반복 확인</h2><section style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(110px,1fr))',gap:12}}>{floorTiles.map(t=><article key={t.id}><FloorSwatch type={t.id}/><p>{t.name}</p></article>)}</section></main>)
