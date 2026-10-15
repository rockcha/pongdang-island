import {cleanup,fireEvent,render,screen,waitFor,within} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
import {ConfirmDialog} from '../src/components/confirm-dialog'

afterEach(cleanup)
const text={title:'새 어항을 구매하겠습니까?',description:'200골드가 사용돼요.'}
it('shows Pongi, question and explanation with cancel focused and exactly two actions',async()=>{
 const change=vi.fn(),confirm=vi.fn()
 render(<ConfirmDialog {...text} open onOpenChange={change} onConfirm={confirm}/>)
 const modal=await screen.findByRole('alertdialog')
 expect(within(modal).getByRole('heading',{name:text.title})).toBeTruthy()
 expect(within(modal).getByText(text.description)).toBeTruthy()
 expect(modal.querySelector('img')?.getAttribute('src')).toBe('/branding/pongi-curious.png')
 expect(within(modal).getAllByRole('button')).toHaveLength(2)
 await waitFor(()=>expect(document.activeElement).toBe(screen.getByRole('button',{name:'취소'})))
 fireEvent.click(screen.getByRole('button',{name:'확인'}))
 expect(confirm).toHaveBeenCalledOnce()
 expect(change).not.toHaveBeenCalled()
 fireEvent.click(screen.getByRole('button',{name:'취소'}))
 expect(change).toHaveBeenCalledWith(false)
})
it('blocks both actions while pending and keeps errors inside the same modal for retry',async()=>{
 const confirm=vi.fn(),change=vi.fn()
 const view=render(<ConfirmDialog {...text} open busy onOpenChange={change} onConfirm={confirm}/>)
 await screen.findByRole('alertdialog')
 expect(screen.getByRole('button',{name:'취소'})).toHaveProperty('disabled',true)
 fireEvent.click(screen.getByRole('button',{name:'처리 중…'}))
 expect(confirm).not.toHaveBeenCalled()
 view.rerender(<ConfirmDialog {...text} open error="다시 시도해주세요." onOpenChange={change} onConfirm={confirm}/>)
 expect(screen.getByRole('alert').textContent).toBe('다시 시도해주세요.')
 expect(screen.getByRole('button',{name:'확인'})).toHaveProperty('disabled',false)
})
