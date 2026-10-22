import {createRoot} from 'react-dom/client'
import {MemoryRouter} from 'react-router'
import {ProductionPage} from '/src/features/production/production-page'
import {PortPage} from '/src/features/port/port-page'
import {GoldProvider} from '/src/features/gold/gold-provider'
import {PlaceBanner} from '/src/components/place-banner'
import '/src/index.css'
const params=new URLSearchParams(location.search),shop=params.has('shop'),port=params.has('port'),path=port?'/port':shop?'/production-shop':'/production'
createRoot(document.getElementById('root')!).render(<MemoryRouter initialEntries={[path]}><GoldProvider><div className="mx-auto flex h-dvh w-full max-w-md flex-col overflow-hidden px-6"><PlaceBanner pathname={path}/><main className="-mx-6 flex min-h-0 flex-1 flex-col overflow-hidden">{port?<PortPage/>:<ProductionPage shop={shop}/>}</main></div></GoldProvider></MemoryRouter>)
