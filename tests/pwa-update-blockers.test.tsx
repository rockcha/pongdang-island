import {cleanup,render,screen} from '@testing-library/react'
import {afterEach,expect,it} from 'vitest'
import {usePwaUpdateBlock,usePwaUpdateBlocked} from '../src/features/pwa/update-blockers'
afterEach(cleanup)
function Block({active}:{active:boolean}){usePwaUpdateBlock(active);return null}
function Status(){return <p>{usePwaUpdateBlocked()?'blocked':'ready'}</p>}
it('waits until every active game finishes and releases on unmount',()=>{
 const view=render(<><Block active/><Block active/><Status/></>)
 expect(screen.getByText('blocked')).toBeTruthy()
 view.rerender(<><Block active={false}/><Block active/><Status/></>)
 expect(screen.getByText('blocked')).toBeTruthy()
 view.rerender(<Status/>)
 expect(screen.getByText('ready')).toBeTruthy()
})
