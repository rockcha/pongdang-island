import {render,screen,fireEvent,cleanup} from '@testing-library/react'
import {afterEach,it,expect,vi} from 'vitest'
import {MemoryRouter,useLocation} from 'react-router'
import {useCatchCelebration,type CatchBatch} from '@/features/expeditions/use-catch-celebration'
import {practiceSpecies} from '@/features/fishing/fishing-practice'
import {getShowcaseDraft} from '@/features/showcase/draft'
vi.mock('@/components/auth-provider',()=>({useAuth:()=>({session:{user:{id:'owner'}}})}))
vi.mock('@/features/fishing/catch-reveal',()=>({CatchReveal:({species,onDismiss,onShare}:any)=><div role="dialog"><p>{species.id}</p><button onClick={onDismiss}>next</button><button onClick={onShare}>share</button></div>}))
const batch:CatchBatch={source:'harbor',tripId:'trip',regionName:'Sea',caughtAt:'2026-10-25T00:00:00Z',items:['common','epic','mythic'].map((rarity,i)=>({id:'catch-'+i,species:practiceSpecies(rarity as any),bonus:false,firstDiscovery:i===1}))}
function Harness(){const c=useCatchCelebration(),location=useLocation();return <><button onClick={()=>c.start([batch])}>claim</button><button onClick={()=>c.open(batch,batch.items[1])}>reopen</button><output data-testid="draft">{location.state?.showcaseDraft}</output>{c.reveal}</>}
afterEach(cleanup)
it('queues only epic/mythic, ignores receipt retries and supports reopening the result',()=>{
 render(<MemoryRouter><Harness/></MemoryRouter>)
 fireEvent.click(screen.getByText('claim'));expect(screen.getByRole('dialog').textContent).toContain(batch.items[1].species.id)
 fireEvent.click(screen.getByText('claim'));fireEvent.click(screen.getByText('next'))
 expect(screen.getByRole('dialog').textContent).toContain(batch.items[2].species.id)
 fireEvent.click(screen.getByText('next'));expect(screen.queryByRole('dialog')).toBeNull()
 fireEvent.click(screen.getByText('reopen'));expect(screen.getByRole('dialog')).toBeTruthy()
})
it('carries the verified catch identity and source into the showcase editor draft',()=>{
 render(<MemoryRouter><Harness/></MemoryRouter>);fireEvent.click(screen.getByText('claim'));fireEvent.click(screen.getByText('share'))
 const draft=getShowcaseDraft('owner',screen.getByTestId('draft').textContent)
 expect(draft).toMatchObject({operationId:'catch-1',tripId:'trip',source:'harbor',firstDiscovery:true,regionName:'Sea',preview:false})
})
