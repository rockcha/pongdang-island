import React from 'react'
import {createRoot} from 'react-dom/client'
import {MemoryRouter} from 'react-router'
import {AppQueryProvider} from '@/lib/account-query'
import {setQueryAccount} from '@/lib/account-cache'
import {PushSettings} from '@/features/notifications/push-settings'
import {ForegroundPush} from '@/features/notifications/foreground-push'
import '@/index.css'
setQueryAccount('push-preview')
createRoot(document.getElementById('root')!).render(<AppQueryProvider><MemoryRouter><ForegroundPush/><main style={{maxWidth:448,margin:'auto',padding:'20px 16px',background:'var(--background)',color:'var(--foreground)',minHeight:'100dvh'}}><h1 style={{fontSize:16,marginBottom:16}}>알림 설정</h1><PushSettings/></main></MemoryRouter></AppQueryProvider>)
