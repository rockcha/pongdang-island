import { StrictMode, lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router'
import { AuthProvider } from '@/components/auth-provider'
import './index.css'
import App from './App.tsx'
import {initializePwaInstall} from '@/features/pwa/install'
import {AppReady,AppRecovery,AppRecoveryBoundary} from '@/components/app-recovery'
import {OverlayHistoryTracker} from '@/components/overlay-back'

initializePwaInstall()

// This development route mounts without account providers or reward RPCs.
const BaitLab = import.meta.env.DEV ? lazy(() => import('@/features/fishing/bait-lab-page')) : null
const AquariumLab = import.meta.env.DEV ? lazy(() => import('@/features/aquarium/aquarium-lab-page')) : null
const router=createBrowserRouter([
 ...(BaitLab ? [{path:'/bait-lab',element:<Suspense fallback={<p>로컬 미끼 테스트 준비 중…</p>}><BaitLab/></Suspense>}] : []),
 ...(AquariumLab ? [{path:'/aquarium-lab',element:<Suspense fallback={<p>넓은 어항을 준비하고 있어요…</p>}><AquariumLab/><AppReady/></Suspense>}] : []),
 {path:'*',element:<AuthProvider><OverlayHistoryTracker/><App /><AppReady/></AuthProvider>,errorElement:<AppRecovery/>},
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppRecoveryBoundary><RouterProvider router={router}/></AppRecoveryBoundary>
  </StrictMode>,
)
