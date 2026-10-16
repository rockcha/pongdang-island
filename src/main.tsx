import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router'
import { AuthProvider } from '@/components/auth-provider'
import './index.css'
import App from './App.tsx'

const router=createBrowserRouter([{path:'*',element:<AuthProvider><App /></AuthProvider>}])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router}/>
  </StrictMode>,
)
