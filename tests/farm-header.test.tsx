import {cleanup,fireEvent,render,screen,within} from '@testing-library/react'
import {MemoryRouter} from 'react-router'
import {afterEach,expect,it} from 'vitest'
import {TopviewFarm} from '@/features/farm/topview-farm'

afterEach(cleanup)
function setup(){return render(<MemoryRouter><TopviewFarm/></MemoryRouter>)}
it('keeps farm identity, balance and capacity in the header and opens the cookbook from the bottom toolbar',()=>{
 const {container}=setup(),header=container.querySelector('header.top-farm-header')!
 expect(within(header).getByRole('heading',{name:'내 농장'})).toBeTruthy()
 expect(within(header).getByRole('button',{name:'테스트 골드 안내'})).toBeTruthy()
 expect(within(header).getByRole('group',{name:'농장 수용 현황'})).toBeTruthy()
 expect(within(header).queryByRole('button',{name:'제작 도감'})).toBeNull()
 const cookbook=within(screen.getByRole('navigation',{name:'농사 도구'})).getByRole('button',{name:'제작 도감'})
 fireEvent.click(cookbook)
 expect(screen.getByRole('dialog')).toBeTruthy()
 expect(screen.getByRole('textbox',{name:'제작품 이름 검색'})).toBeTruthy()
 fireEvent.click(screen.getByRole('button',{name:'Close'}))
 expect(screen.queryByRole('dialog')).toBeNull()
})
it('shows undo beside the editing tools only while editing',()=>{
 const {container}=setup()
 expect(screen.queryByRole('button',{name:'한 단계 되돌리기'})).toBeNull()
 fireEvent.click(screen.getByRole('button',{name:'이동하기',exact:true}))
 const undo=screen.getByRole('button',{name:'한 단계 되돌리기'})
 expect(undo.closest('.top-farm-bottom')).toBeTruthy()
 expect(undo.disabled).toBe(true)
 expect(within(container.querySelector('header.top-farm-header')!).queryByRole('button',{name:'한 단계 되돌리기'})).toBeNull()
 fireEvent.click(screen.getByRole('button',{name:'완료'}))
 expect(screen.queryByRole('button',{name:'한 단계 되돌리기'})).toBeNull()
})
