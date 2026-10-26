import {createRoot} from 'react-dom/client'
import {MemoryRouter} from 'react-router'
import {MyIslandPage} from '/src/features/my-island/my-island-coming-soon'
import '/src/index.css'
createRoot(document.getElementById('root')!).render(<MemoryRouter><MyIslandPage/></MemoryRouter>)
