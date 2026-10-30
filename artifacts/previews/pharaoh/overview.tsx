import {createRoot} from 'react-dom/client'
import {MemoryRouter} from 'react-router'
import {QueryClient,QueryClientProvider} from '@tanstack/react-query'
import '@/index.css'
import {HomePage} from '@/pages/home-page'
import {HarborPage} from '@/pages/harbor-page'
import {FishingStandby} from '@/features/fishing/fishing-environment'
const view=new URLSearchParams(location.search).get('view')
createRoot(document.getElementById('root')!).render(<QueryClientProvider client={new QueryClient()}><MemoryRouter><main style={{height:'100dvh',maxWidth:560,margin:'auto',display:'flex',flexDirection:'column',overflow:'hidden'}}>{view==='fishing'?<div style={{position:'relative',height:'100%'}}><FishingStandby regionId="pharaoh"/></div>:view==='harbor'?<HarborPage/>:<HomePage/>}</main></MemoryRouter></QueryClientProvider>)
