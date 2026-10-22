import {createRoot} from 'react-dom/client'
import {MemoryRouter,Routes,Route} from 'react-router'
import {AppLayout} from '/src/layouts/app-layout'
import {ProductionPage} from '/src/features/production/production-page'
import {GoldProvider} from '/src/features/gold/gold-provider'
import '/src/index.css'
const path=new URLSearchParams(location.search).get('path')??'/production'
createRoot(document.getElementById('root')!).render(<MemoryRouter initialEntries={[path]}><GoldProvider><Routes><Route element={<AppLayout/>}><Route path="production" element={<ProductionPage/>}/><Route path="production-shop" element={<ProductionPage shop/>}/></Route></Routes></GoldProvider></MemoryRouter>)
