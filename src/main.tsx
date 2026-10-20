import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router'
import { AuthProvider } from '@/components/auth-provider'
import { ThemeProvider } from '@/components/theme-provider'
import './index.css'
import App from './App.tsx'
import {initializePwaInstall} from '@/features/pwa/install'
import {AppReady,AppRecovery,AppRecoveryBoundary} from '@/components/app-recovery'

initializePwaInstall()

const router=createBrowserRouter([{path:'*',element:<AuthProvider><App /><AppReady/></AuthProvider>,errorElement:<AppRecovery/>}])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppRecoveryBoundary><ThemeProvider><RouterProvider router={router}/></ThemeProvider></AppRecoveryBoundary>
  </StrictMode>,
)
