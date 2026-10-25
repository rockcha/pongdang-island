import {afterEach,expect,it,vi} from 'vitest'
import {cleanup,fireEvent,render,screen} from '@testing-library/react'
import {MemoryRouter} from 'react-router'
import {SettingsPage} from '@/pages/settings-page'
import {biteConfirmationKey,readBiteConfirmation,saveBiteConfirmation} from '@/features/fishing/bite-confirmation-preference'

afterEach(()=>{cleanup();vi.restoreAllMocks();saveBiteConfirmation(false);localStorage.clear()})
const mount=()=>render(<MemoryRouter><SettingsPage/></MemoryRouter>)

it('defaults to bite confirmation and preserves an explicit off setting after remount',()=>{
 const page=mount()
 expect(screen.queryByText('다크 모드')).toBeNull()
 expect(screen.queryByText('화면 설정')).toBeNull()
 expect(screen.getByRole('switch',{name:'입질 확인 후 시작'}).getAttribute('aria-checked')).toBe('true')
 fireEvent.click(screen.getByRole('switch',{name:'입질 확인 후 시작'}))
 expect(localStorage.getItem(biteConfirmationKey)).toBe('false')
 page.unmount();mount()
 expect(screen.getByRole('switch',{name:'입질 확인 후 시작'}).getAttribute('aria-checked')).toBe('false')
 fireEvent.click(screen.getByRole('switch',{name:'입질 확인 후 시작'}))
 expect(readBiteConfirmation()).toBe(true)
})

it('keeps the selection usable for this session if browser storage is blocked',()=>{
 mount()
 vi.spyOn(Storage.prototype,'setItem').mockImplementation(()=>{throw Error('blocked')})
 fireEvent.click(screen.getByRole('switch',{name:'입질 확인 후 시작'}))
 expect(screen.getByRole('switch',{name:'입질 확인 후 시작'}).getAttribute('aria-checked')).toBe('false')
 expect(readBiteConfirmation()).toBe(false)
 expect(screen.getByRole('alert').textContent).toContain('저장하지 못했어요')
})

it('keeps the default enabled when browser storage cannot be read',()=>{
 vi.spyOn(Storage.prototype,'getItem').mockImplementation(()=>{throw Error('blocked')})
 expect(readBiteConfirmation()).toBe(true)
})
