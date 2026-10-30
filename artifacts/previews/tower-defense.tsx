import React from 'react'
import {createRoot} from 'react-dom/client'
import {createMemoryRouter,RouterProvider} from 'react-router'
import TowerDefenseGame from '@/features/arcade/tower-defense-game'
import '@/index.css'
const router=createMemoryRouter([{path:'/',element:<main style={{height:'100svh',maxWidth:680,margin:'auto',display:'flex',flexDirection:'column'}}><TowerDefenseGame/></main>}])
createRoot(document.getElementById('root')!).render(<RouterProvider router={router}/>)
