import {cleanup,render,screen} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
import {CatchReveal} from '@/features/fishing/catch-reveal'
import {ExpeditionResults} from '@/features/expeditions/expedition-results'
import type {Species} from '@/features/collection/api'
vi.mock('@/features/collection/api',()=>({collectibleUrl:(p:string)=>p}))
const species={id:'test-fish',name:'새 물고기',thumbnail_path:'/fish.png',rarity:'common',description:'작은 물고기'} as Species
afterEach(cleanup)
it('shows NEW only for a first real catch',()=>{
 const view=render(<CatchReveal species={species} firstDiscovery onDismiss={()=>{}}/>)
 expect(screen.getByLabelText('첫 발견').textContent).toContain('NEW')
 view.rerender(<CatchReveal species={species} firstDiscovery practice onDismiss={()=>{}}/>)
 expect(screen.queryByLabelText('첫 발견')).toBeNull()
 view.rerender(<CatchReveal species={species} onDismiss={()=>{}}/>)
 expect(screen.queryByLabelText('첫 발견')).toBeNull()
})
it.each([false,true])('groups first discoveries once in trap and harbor results (compact=%s)',compact=>{
 const outcome={items:[{id:'1',species,bonus:false,firstDiscovery:false},{id:'2',species,bonus:false,firstDiscovery:true}]}
 const view=render(<ExpeditionResults outcome={outcome} compact={compact}/>)
 expect(screen.getAllByLabelText('첫 발견')).toHaveLength(1)
 view.rerender(<ExpeditionResults outcome={outcome} compact={compact} preview/>)
 expect(screen.queryByLabelText('첫 발견')).toBeNull()
})
