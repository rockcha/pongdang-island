import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { DestinationStrip } from '@/features/regions/destination-strip'

afterEach(()=>{cleanup();vi.restoreAllMocks()})
it('drags with a mouse without selecting a destination, and still allows a regular click',()=>{
 const select=vi.fn()
 render(<DestinationStrip><button onClick={select}>목적지</button></DestinationStrip>)
 const strip=screen.getByRole('group')
 function pointer(type:string,x:number){
  const event=new MouseEvent(type,{bubbles:true,cancelable:true,clientX:x,button:0})
  Object.defineProperties(event,{pointerId:{value:1},pointerType:{value:'mouse'}})
  fireEvent(strip,event)
 }
 pointer('pointerdown',200)
 pointer('pointermove',100)
 expect(strip.scrollLeft).toBe(100)
 pointer('pointerup',100)
 fireEvent.click(screen.getByRole('button'))
 expect(select).not.toHaveBeenCalled()
 pointer('pointerdown',100)
 pointer('pointerup',100)
 fireEvent.click(screen.getByRole('button'))
 expect(select).toHaveBeenCalledTimes(1)
})
it('wraps in both directions while keeping only one accessible set of destinations',()=>{
 vi.spyOn(HTMLElement.prototype,'getBoundingClientRect').mockReturnValue({width:300} as DOMRect)
 const select=vi.fn()
 render(<DestinationStrip><button onClick={select}>Destination</button><button>Next</button></DestinationStrip>)
 const strip=screen.getByRole('group')
 expect(strip.scrollLeft).toBe(308)
 expect(screen.getAllByRole('button')).toHaveLength(2)
 strip.scrollLeft=298;fireEvent.scroll(strip)
 expect(strip.scrollLeft).toBe(606)
 strip.scrollLeft=626;fireEvent.scroll(strip)
 expect(strip.scrollLeft).toBe(318)
 const copies=screen.getAllByText('Destination')
 expect(copies[0].tabIndex).toBe(-1)
 fireEvent.click(copies[0])
 expect(select).toHaveBeenCalledTimes(1)
})
