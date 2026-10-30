import {StrictMode} from 'react'
import {createRoot} from 'react-dom/client'
import {createMemoryRouter,RouterProvider} from 'react-router'
import {ExplorationPage} from '/src/features/exploration/exploration-page'
import '/src/index.css'
const router=createMemoryRouter([{path:'/',element:<main className="mx-auto h-dvh max-w-md overflow-y-auto bg-background"><ExplorationPage/></main>}])
createRoot(document.getElementById('root')!).render(<StrictMode><RouterProvider router={router}/></StrictMode>)
