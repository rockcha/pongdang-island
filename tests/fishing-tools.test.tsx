import {useEffect} from 'react'
import {createPortal} from 'react-dom'
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react'
import {afterEach,expect,it} from 'vitest'
import {MemoryRouter} from 'react-router'
import {FishingTools,useFishingTools} from '@/features/fishing/fishing-tools'
import type {RegionMap} from '@/features/regions/api'
const map={currentRegion:'pongdang',regions:[{id:'pongdang',name:'퐁당섬',unlocked:true}]} as RegionMap
function Contents(){
 const tools=useFishingTools()!
 useEffect(()=>tools.setEmpty(true),[tools.setEmpty])
 return <><p hidden={tools.collapsed}>알고 계신가요?</p>{tools.soundTarget&&createPortal(<button>소리 조절</button>,tools.soundTarget)}{tools.baitTarget&&createPortal(<button>미끼 선택</button>,tools.baitTarget)}{tools.rodTarget&&createPortal(<button>낚싯대</button>,tools.rodTarget)}{tools.equipmentTarget&&createPortal(<><button>보관함</button><button>도감</button></>,tools.equipmentTarget)}</>
}
afterEach(()=>{cleanup();localStorage.clear()})
it('collapses tools and tips together while retaining mounted sound controls and remembers the preference',async()=>{
 const view=render(<MemoryRouter><FishingTools map={map}><Contents/></FishingTools></MemoryRouter>)
 await screen.findByRole('button',{name:'미끼 선택'})
 expect(screen.getAllByRole('button').map(button=>button.getAttribute('aria-label')??button.textContent)).toEqual(['낚시 도구 접기','소리 조절','지도','보관함','도감','낚싯대','미끼 선택'])
 fireEvent.click(screen.getByRole('button',{name:'낚시 도구 접기'}))
 expect(screen.queryByRole('button',{name:'지도'})).toBeNull()
 expect(screen.queryByRole('button',{name:'소리 조절'})).toBeNull()
 expect(screen.getByRole('button',{name:'소리 조절',hidden:true})).toBeTruthy()
 for(const name of ['보관함','도감'])expect(screen.queryByRole('button',{name})).toBeNull()
 const equipment=screen.getByRole('group',{name:'장착한 낚싯대와 미끼'})
 expect(equipment.contains(screen.getByRole('button',{name:'낚싯대'}))).toBe(true)
 expect(equipment.contains(screen.getByRole('button',{name:'미끼 선택'}))).toBe(true)
 expect(screen.getByText('알고 계신가요?').hidden).toBe(true)
 await screen.findByLabelText('선택한 미끼 없음')
 view.unmount()
 render(<MemoryRouter><FishingTools map={map}><Contents/></FishingTools></MemoryRouter>)
 expect(screen.getByRole('button',{name:'낚시 도구 펼치기'}).getAttribute('aria-expanded')).toBe('false')
 fireEvent.click(screen.getByRole('button',{name:'낚시 도구 펼치기'}))
 await waitFor(()=>expect(screen.getByRole('button',{name:'미끼 선택'})).toBeTruthy())
 expect(screen.getByRole('button',{name:'지도'})).toBeTruthy()
 for(const name of ['보관함','낚싯대','도감'])expect(screen.getByRole('button',{name})).toBeTruthy()
})
