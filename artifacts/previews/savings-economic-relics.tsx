import React from 'react'
import {createRoot} from 'react-dom/client'
import {AppQueryProvider} from '@/lib/account-query'
import {setQueryAccount} from '@/lib/account-cache'
import {SavingsPage} from '@/features/savings/savings-page'
import '@/index.css'
setQueryAccount('savings-relic-preview')
createRoot(document.getElementById('root')!).render(<AppQueryProvider><main style={{height:'100dvh',maxWidth:520,margin:'auto',display:'flex',flexDirection:'column'}}><SavingsPage/></main></AppQueryProvider>)
