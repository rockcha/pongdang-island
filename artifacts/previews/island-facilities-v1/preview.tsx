import {createRoot} from 'react-dom/client'
import {MemoryRouter} from 'react-router'
import {IslandEditor} from '/src/features/my-island/my-island-page'
import {ownedFacilities} from '/src/features/my-island/owned-facilities'
import '/src/index.css'
createRoot(document.getElementById('root')!).render(<MemoryRouter><IslandEditor storageKey="png-facility-review-v1" managed={ownedFacilities()}/></MemoryRouter>)
