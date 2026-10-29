import React from 'react'
import {createRoot} from 'react-dom/client'
import {MemoryRouter} from 'react-router'
import {AppQueryProvider} from '@/lib/account-query'
import {setQueryAccount} from '@/lib/account-cache'
import {RelicPage,RelicLoadout} from '@/features/relics/relic-loadout'
import '@/index.css'
setQueryAccount('atelier-preview')
createRoot(document.getElementById('root')!).render(<AppQueryProvider><MemoryRouter><main style={{height:'100dvh',maxWidth:520,margin:'auto',display:'flex',flexDirection:'column',background:'var(--background)',color:'var(--foreground)'}}><header style={{padding:'12px 20px',borderBottom:'1px solid var(--border)',display:'flex',justifyContent:'space-between',fontSize:12}}><span>퐁당섬</span><span>유물</span></header>{new URLSearchParams(location.search).has('dialog')?<RelicLoadout/>:<RelicPage/>}</main></MemoryRouter></AppQueryProvider>)
