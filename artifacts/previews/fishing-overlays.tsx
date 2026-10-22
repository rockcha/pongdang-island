import React from 'react'
import {createRoot} from 'react-dom/client'
import {MemoryRouter} from 'react-router'
import {SettingsPage} from '../../src/pages/settings-page'
import {TensionFishingGame} from '../../src/features/fishing/tension-fishing-game'
import '../../src/index.css'

const mode=new URLSearchParams(location.search).get('mode')??'waiting'
Math.random=()=>.31415
document.body.style.margin='0'
createRoot(document.getElementById('root')!).render(mode==='settings'?<MemoryRouter><main className="mx-auto min-h-dvh max-w-xl px-5"><SettingsPage/></main></MemoryRouter>:<main className="flex h-dvh flex-col overflow-hidden"><header className="flex h-20 shrink-0 items-end bg-[#f5f0e5] px-5 pb-4 text-lg text-primary">퐁당섬 앞바다</header><TensionFishingGame backgroundMusic castId={mode} challenge={{wait:mode==='ready'?.2:80,confirmBite:mode==='ready'}} onCaught={()=>{}} onCancel={()=>{}} onFailed={()=>{}}/></main>)
