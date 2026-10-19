import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router'
import { AuthProvider } from '@/components/auth-provider'
import { ThemeProvider } from '@/components/theme-provider'
import './index.css'
import App from './App.tsx'
import {initializePwaInstall} from '@/features/pwa/install'

initializePwaInstall()

const router=createBrowserRouter([{path:'*',element:<AuthProvider><App /></AuthProvider>}])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider><RouterProvider router={router}/></ThemeProvider>
  </StrictMode>,
)
