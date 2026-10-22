import {createRoot} from 'react-dom/client'
import {regionIcons} from '/src/features/regions/region-icons'
import {HabitatFilters} from '/src/features/collection/habitat-icons'
import '/src/index.css'
const regions=['siren','nyamnyam'].map(id=>({id,...regionIcons[id]}))
createRoot(document.getElementById('root')!).render(<main style={{padding:24,background:'#fff7eb',maxWidth:440}}><h1>해역 아이콘</h1>{regions.map(r=><section key={r.id} style={{margin:'20px 0'}}><p>{r.name}</p><div style={{display:'flex',gap:20,alignItems:'center'}}>{[24,36,64].map(size=><img key={size} src={r.src} alt={`${r.name} ${size}px`} width={size} height={size}/>)}</div></section>)}<HabitatFilters habitats={regions} selected={[]} onToggle={()=>{}}/></main>)
